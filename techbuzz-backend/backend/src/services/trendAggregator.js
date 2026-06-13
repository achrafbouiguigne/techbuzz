const EnrichedPost = require('../models/EnrichedPost');
const { publishTrends } = require('./redisService');
const logger = require('../utils/logger');

async function aggregateTrends() {
  try {
    
    const posts = await EnrichedPost.find().sort({ timestamp: -1 }).limit(1000).lean();
    
    if (!posts || posts.length === 0) return;

    const keywordStats = {};

    posts.forEach(post => {
      if (!post.keywords || !Array.isArray(post.keywords)) return;
      
      
      const sentiment = post.confidence || 0.5;

      post.keywords.forEach(kw => {
        const text = kw.text.toLowerCase();
        
        if (text.length < 2) return;

        if (!keywordStats[text]) {
          keywordStats[text] = {
            count: 0,
            totalSentiment: 0
          };
        }
        
        keywordStats[text].count += 1;
        keywordStats[text].totalSentiment += sentiment;
      });
    });

    
    const trends = Object.keys(keywordStats).map(keyword => {
      const stats = keywordStats[keyword];
      return {
        keyword: keyword,
        count: stats.count,
        totalScore: stats.count, 
        avgScore: 0,
        totalComments: 0,
        momentum: stats.count * 10, 
        avgSentiment: stats.totalSentiment / stats.count,
        subreddits: [],
        topPost: null
      };
    });

    
    trends.sort((a, b) => b.momentum - a.momentum);

    
    const topTrends = trends.slice(0, 10);

    
    await publishTrends(topTrends);
    logger.debug(`[TrendAggregator] Aggregated and published ${topTrends.length} live trends.`);

  } catch (err) {
    logger.error(`[TrendAggregator] Error calculating trends: ${err.message}`);
  }
}


function startTrendAggregator() {
  logger.info('🚀 Starting Live Trend Aggregator...');
  aggregateTrends(); 
  setInterval(aggregateTrends, 10000);
}

module.exports = { startTrendAggregator, aggregateTrends };
