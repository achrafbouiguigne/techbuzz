const { Queue, Worker, QueueEvents } = require('bullmq');
const logger = require('../utils/logger');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};


function createQueue(name, opts = {}) {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },  
      removeOnFail:     { count: 50 },   
    },
    ...opts,
  });
}


function createWorker(name, processor, opts = {}) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency: 5,  
    ...opts,
  });

  
  worker.on('completed', job => {
    logger.info(`[${name}] ✓ Job ${job.id} complété`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`[${name}] ✗ Job ${job.id} échoué:`, err.message);
  });
  worker.on('error', err => {
    logger.error(`[${name}] Erreur worker:`, err.message);
  });

  return worker;
}

module.exports = { createQueue, createWorker, connection };