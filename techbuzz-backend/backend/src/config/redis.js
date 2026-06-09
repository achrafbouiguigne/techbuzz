const { createClient } = require('redis');

const publisher  = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subscriber = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const logger = require('../utils/logger');

let isConnected = false;

async function connectRedis() {
  if (isConnected) return;
  try {
    await publisher.connect();
    await subscriber.connect();
    isConnected = true;
    logger.info('[Redis] Connecté');
  } catch (err) {
    logger.error('[Redis] Erreur de connexion', err);
  }
}

async function getRedisClient() {
  await connectRedis();
  return publisher;
}

module.exports = { connectRedis, getRedisClient, publisher, subscriber };
