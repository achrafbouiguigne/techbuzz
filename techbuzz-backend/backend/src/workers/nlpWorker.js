const { createWorker } = require('../queues/index');
const { enrichedQueue } = require('../queues/postQueue');

const EnrichedPost = require('../models/EnrichedPost');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');
const { processWithPythonNLP } = require('../services/pythonBridgeService'); 

let enrichedCount = 0;
let failedCount = 0;

const nlpWorker = createWorker('processed_posts', async (job) => {
  const end = metrics.jobDuration.startTimer({ worker: 'nlp' });
  const post = job.data;

  try {
    
    
    
    logger.debug(`[NLPWorker] Envoi post ${post.redditId} au worker Python...`);
    
    const nlpResult = await processWithPythonNLP({
      _id: post._id,
      redditId: post.redditId,
      title: post.title,
      content: post.content || '',
      subreddit: post.subreddit
    });

    
    
    
    const enriched = {
      
      redditId: post.redditId,
      title: post.title,
      content: post.content,
      author: post.author,
      subreddit: post.subreddit,
      scoreRaw: post.scoreRaw,
      upvoteRatio: post.upvoteRatio,
      numComments: post.numComments,
      url: post.url,
      flair: post.flair,
      createdAt: post.createdAt,
      collectedAt: post.collectedAt,
      category: post.category,

      
      keywords: nlpResult.keywords?.map(k => k.text) || [],
      entities: nlpResult.entities || [],
      sentiment: nlpResult.sentiment?.label || 'neutral',
      sentimentScore: nlpResult.sentiment?.score ?? 0,
      language: nlpResult.language || 'en',

      
      nlpProcessedAt: new Date(),
      nlpModelVersion: nlpResult.model_version || 'python-v1.0',
      nlpProcessingTimeMs: nlpResult.processing_time_ms
    };

    
    
    
    await EnrichedPost.findOneAndUpdate(
      { redditId: enriched.redditId }, 
      enriched,
      { upsert: true, returnDocument: 'after' } 
    );

    
    
    
    await enrichedQueue.add('compute-trends', enriched, {
      removeOnComplete: 100, 
      removeOnFail: 50       
    });

    
    enrichedCount++;
    metrics.jobsProcessed.inc({ worker: 'nlp', status: 'success' });
    logger.info(`[NLPWorker] ✅ Post ${post.redditId} enrichi: ${enriched.keywords.length} keywords`);
    
    return { 
      success: true, 
      redditId: post.redditId,
      keywordsCount: enriched.keywords.length,
      processingTime: nlpResult.processing_time_ms
    };

  } catch (err) {
    
    failedCount++;
    metrics.jobsProcessed.inc({ worker: 'nlp', status: 'error' });
    metrics.jobsFailed.inc({ worker: 'NLPWorker' });
    
    logger.error(`[NLPWorker] ❌ Échec enrichissement post ${post.redditId}:`, {
      error: err.message,
      stack: err.stack,
      pythonAvailable: err.code !== 'PYTHON_UNAVAILABLE'
    });

    
    if (err.message.includes('timeout') || err.message.includes('Redis')) {
      throw err; 
    }

    
    
    
    

    return { 
      failed: true, 
      redditId: post.redditId,
      error: err.message 
    };

  } finally {
    end(); 
  }
}, {
  concurrency: 5, 
  limiter: {
    max: 10, 
    duration: 1000 
  }
});


setInterval(() => {
  if (enrichedCount > 0 || failedCount > 0) {
    logger.info(`[NLPWorker] 📊 Stats — enrichis: ${enrichedCount} | échoués: ${failedCount} | taux: ${Math.round(enrichedCount/(enrichedCount+failedCount)*100)}%`);
    
    
    
  }
}, 60000);


process.on('SIGINT', async () => {
  logger.info('[NLPWorker] 🛑 Arrêt gracieux...');
  await nlpWorker.close();
  process.exit(0);
});

module.exports = nlpWorker;