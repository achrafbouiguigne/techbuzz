const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const EnrichedPost = require('../models/EnrichedPost');
const { getLatestTrends, subscriber } = require('../services/redisService');
const { getAIRecommendation } = require('../services/aiService');
const { PubSub } = require('graphql-subscriptions');
const { publisher } = require('../config/redis');

const pubsub = new PubSub();

// Quand Redis reçoit un update → on forward à GraphQL Subscriptions
subscriber.subscribe('trends:update', (message) => {
  pubsub.publish('TRENDS_UPDATED', {
    trendsUpdated: JSON.parse(message)
  });
});

let activePredictTrendsPromise = null;

const runLSTMForecast = (inputObj) => {
  return new Promise((resolve, reject) => {
    logger.info(`[LSTM] Spawning Docker child process for forecasting. Input keys: ${Object.keys(inputObj).join(', ')}`);
    const child = spawn('docker', [
      'exec', 
      '-i',
      '-e', 'OMP_NUM_THREADS=1', 
      '-e', 'MKL_NUM_THREADS=1', 
      '-e', 'CUDA_VISIBLE_DEVICES=""', 
      'techbuzz_nlp_worker', 
      'python', '/app/lstm_forecaster.py'
    ]);
    
    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      logger.info(`[LSTM] STDOUT chunk: ${chunk}`);
      stdoutData += chunk;
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      logger.warn(`[LSTM] STDERR chunk: ${chunk}`);
      stderrData += chunk;
    });

    child.on('error', (err) => {
      logger.error(`[LSTM] Process spawn/execution error: ${err.message}`);
      reject(err);
    });

    child.on('close', (code) => {
      logger.info(`[LSTM] Process closed with code: ${code}`);
      if (code !== 0) {
        logger.error(`LSTM PyTorch error (code ${code}): ${stderrData}`);
        return reject(new Error(`LSTM prediction failed: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Failed to parse LSTM response: ${e.message}. Raw output: ${stdoutData}`));
      }
    });

    // Write input JSON to standard input of the container process
    logger.info('[LSTM] Writing JSON payload to stdin...');
    child.stdin.write(JSON.stringify(inputObj));
    child.stdin.end();
    logger.info('[LSTM] stdin closed.');
  });
};

const resolvers = {
  Query: {
    currentTrends: async () => {
      return await getLatestTrends() || [];
    },
    history: async (_, { limit = 50 }) => {
      return await EnrichedPost.find().sort({ timestamp: -1 }).limit(limit);
    },
    enrichedPosts: async (_, { company, location, limit = 100 }) => {
      const query = {};
      if (company) query.companies = company;
      if (location) query.locations = location;
      return await EnrichedPost.find(query).sort({ timestamp: -1 }).limit(limit);
    },
    totalPostCount: async () => {
      try {
        return await EnrichedPost.countDocuments();
      } catch (err) {
        logger.error(`Error in totalPostCount resolver: ${err.message}`);
        return 0;
      }
    },
    aiRecommendation: async (_, { country, domain }) => {
      return await getAIRecommendation(country, domain);
    },
    predictTrends: async (_, { daysAhead = 7 }) => {
      const cacheKey = `lstm:predictions:days:${daysAhead}`;
      
      // 1. Check Redis Cache
      try {
        const cached = await publisher.get(cacheKey);
        if (cached) {
          logger.info(`[LSTM] Cache Hit for key: ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch (cacheErr) {
        logger.warn(`[LSTM] Cache read error: ${cacheErr.message}`);
      }

      // 2. Coalesce concurrent requests (single-flight pattern)
      if (activePredictTrendsPromise) {
        logger.info(`[LSTM] Joining existing active prediction promise`);
        return activePredictTrendsPromise;
      }

      activePredictTrendsPromise = (async () => {
        try {
          const topTrends = await getLatestTrends() || [];
          let topKeywords = topTrends.slice(0, 5).map(t => t.keyword);
          
          if (topKeywords.length === 0) {
            topKeywords = ['react', 'python', 'kubernetes', 'docker', 'ai'];
          }

          const now = new Date();
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

          // Optimize MongoDB query: exclude embeddings, use lean()
          const posts = await EnrichedPost.find(
            { timestamp: { $gte: fourteenDaysAgo } },
            { title: 1, content: 1, timestamp: 1 }
          ).lean();

          const dateKeys = [];
          for (let i = 13; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dateKeys.push(d.toISOString().slice(0, 10));
          }

          const keywordCounts = {};
          topKeywords.forEach(kw => {
            keywordCounts[kw] = dateKeys.reduce((acc, dt) => {
              acc[dt] = 0;
              return acc;
            }, {});
          });

          posts.forEach(post => {
            if (!post.timestamp) return;
            const postDate = new Date(post.timestamp).toISOString().slice(0, 10);
            if (keywordCounts[topKeywords[0]] && keywordCounts[topKeywords[0]][postDate] !== undefined) {
              const text = `${post.title} ${post.content || ''}`.toLowerCase();
              topKeywords.forEach(kw => {
                if (text.includes(kw.toLowerCase())) {
                  keywordCounts[kw][postDate]++;
                }
              });
            }
          });

          const pythonInput = {};
          topKeywords.forEach(kw => {
            pythonInput[kw] = dateKeys.map(dt => keywordCounts[kw][dt]);
          });

          const predictions = await runLSTMForecast(pythonInput);

          const results = topKeywords.map(kw => {
            const pred = predictions[kw];
            if (!pred) return null;

            const histDates = [];
            for (let i = 29; i >= 0; i--) {
              const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
              histDates.push(d.toISOString().slice(0, 10));
            }

            const foreDates = [];
            for (let i = 1; i <= 7; i++) {
              const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
              foreDates.push(d.toISOString().slice(0, 10));
            }

            const historicalForecast = pred.historical.map((val, idx) => ({
              date: histDates[idx] || `Day -${30 - idx}`,
              count: val
            }));

            const futureForecast = pred.forecast.map((val, idx) => ({
              date: foreDates[idx] || `Day +${idx + 1}`,
              count: val
            }));

            return {
              keyword: kw,
              historical: historicalForecast,
              forecast: futureForecast,
              confidenceScore: pred.confidence
            };
          }).filter(Boolean);

          // 3. Save to Redis Cache (Expires in 5 minutes = 300 seconds)
          try {
            await publisher.setEx(cacheKey, 300, JSON.stringify(results));
            logger.info(`[LSTM] Cached new predictions in Redis for key: ${cacheKey}`);
          } catch (cacheErr) {
            logger.warn(`[LSTM] Cache write error: ${cacheErr.message}`);
          }

          return results;
        } catch (err) {
          logger.error(`Error in predictTrends resolver inner: ${err.message}`);
          throw err;
        } finally {
          activePredictTrendsPromise = null;
        }
      })();

      try {
        return await activePredictTrendsPromise;
      } catch (err) {
        logger.error(`Error in predictTrends resolver outer: ${err.message}`);
        throw new Error(`Failed to calculate LSTM forecasts: ${err.message}`);
      }
    }
  },
  Subscription: {
    trendsUpdated: {
      subscribe: () => pubsub.asyncIterator(['TRENDS_UPDATED'])
    }
  }
};

module.exports = { resolvers, pubsub };