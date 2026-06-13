



const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

async function ensureConsumerGroup(redis, streamName, groupName, startId = '$') {
  try {
    await redis.xGroupCreate(streamName, groupName, startId, { MKSTREAM: true });
    logger.info(`✅ Consumer group ${groupName} created on ${streamName}`);
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      throw err;
    }
  }
}


async function startConsumer(streamName, groupName, consumerName, handler, useIdempotency = true) {
  const baseRedis = await getRedisClient();
  const redis = baseRedis.duplicate();
  await redis.connect();
  await ensureConsumerGroup(redis, streamName, groupName, '0');

  logger.info(`🚀 Starting consumer ${consumerName} on group ${groupName} (${streamName})`);

  while (true) {
    try {
      const results = await redis.xReadGroup(
        groupName,
        consumerName,
        [{ key: streamName, id: '>' }],
        { COUNT: 10, BLOCK: 5000 }
      );

      if (!results) continue;

      for (const { name, messages } of results) {
        for (const message of messages) {
          const { id: redisId, message: event } = message;
          const { eventId, data } = event;

          
          if (useIdempotency) {
            const isProcessed = await redis.set(`processed:${groupName}:${eventId}`, '1', { NX: true, EX: 86400 });
            if (!isProcessed) {
              logger.warn(`⚠️ Event ${eventId} already processed by ${groupName}, skipping.`);
              await redis.xAck(streamName, groupName, redisId);
              continue;
            }
          }

          try {
            await handler(event);
            await redis.xAck(streamName, groupName, redisId);
          } catch (err) {
            logger.error(`❌ Error processing event ${eventId}:`, err.message);
            
            
            const attemptKey = `attempts:${groupName}:${eventId}`;
            const attempts = await redis.incr(attemptKey);
            await redis.expire(attemptKey, 7 * 86400);

            if (useIdempotency) {
               
               await redis.del(`processed:${groupName}:${eventId}`);
            }

            if (attempts >= 3) {
              logger.error(`🚨 Event ${eventId} failed 3 times, moving to DLQ.`);
              await redis.xAdd(`${streamName}:dlq`, '*', {
                originalEvent: JSON.stringify(event),
                error: err.message,
                failedAt: new Date().toISOString(),
                attempts: String(attempts)
              });
              await redis.xAck(streamName, groupName, redisId);
            }
            
          }
        }
      }
    } catch (err) {
      logger.error('❌ Redis Stream read error:', err.message);
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

module.exports = { ensureConsumerGroup, startConsumer };
