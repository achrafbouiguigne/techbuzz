const cron = require('node-cron');
const { fetchAllSubreddits } = require('../collectors/redditCollector');
const { fetchWebScraperPosts } = require('../collectors/webScraperCollector');
const logger = require('../utils/logger');
const { metrics } = require('../monitoring/metrics');

async function runCollection() {
  logger.info('[Scheduler] Starting background ingestion task...');
  const startTime = Date.now();

  try {
    
    const results = await Promise.allSettled([
      fetchAllSubreddits(),
      fetchWebScraperPosts()
    ]);

    
    if (results[0].status === 'fulfilled') {
      const posts = results[0].value || [];
      metrics.postsCollected.inc(posts.length);
      logger.info(`[Scheduler] Reddit collector finished: ${posts.length} relevant posts parsed.`);
    } else {
      logger.error(`[Scheduler] Reddit collector failed:`, results[0].reason?.message || results[0].reason);
    }

    
    if (results[1].status === 'fulfilled') {
      const posts = results[1].value || [];
      metrics.postsCollected.inc(posts.length);
      logger.info(`[Scheduler] Web Scraper collector finished: ${posts.length} relevant posts parsed.`);
    } else {
      logger.error(`[Scheduler] Web Scraper collector failed:`, results[1].reason?.message || results[1].reason);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[Scheduler] Ingestion cycle complete in ${duration}s`);

  } catch (err) {
    logger.error('[Scheduler] Ingestion cycle error:', err.message);
  }
}

function startScheduler() {
  
  runCollection();

  
  cron.schedule('*/10 * * * *', runCollection);

  logger.info('[Scheduler] Ingestion cron job scheduled (every 10 minutes)');
}

module.exports = { startScheduler };