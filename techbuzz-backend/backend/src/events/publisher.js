



const { getRedisClient } = require('../config/redis');


async function publishEvent(streamName, eventType, aggregateId, producer, payload) {
  const redis = await getRedisClient();
  const eventId = `${eventType}:${aggregateId}`;
  
  const envelope = {
    eventId,
    eventType,
    eventVersion: '1.0',
    occurredAt: new Date().toISOString(),
    aggregateId,
    producer,
    data: JSON.stringify(payload)
  };

  
  await redis.xAdd(
    streamName,
    '*', 
    {
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      eventVersion: envelope.eventVersion,
      occurredAt: envelope.occurredAt,
      aggregateId: envelope.aggregateId,
      producer: envelope.producer,
      data: envelope.data
    },
    {
      TRIM: {
        strategy: 'MAXLEN',
        strategyModifier: '~',
        threshold: 500000
      }
    }
  );

  return eventId;
}

module.exports = { publishEvent };
