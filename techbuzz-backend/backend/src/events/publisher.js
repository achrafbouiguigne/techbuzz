// ============================================================================
// InptPulse v2 — Event Publisher
// ============================================================================

const { getRedisClient } = require('../config/redis');

/**
 * Publie un événement métier dans Redis Streams.
 * Structure standard d'enveloppe garantie.
 * 
 * @param {string} streamName - Le nom du stream (depuis STREAMS)
 * @param {string} eventType - Le type d'événement
 * @param {string} aggregateId - Identifiant fonctionnel (ex: post:reddit:123)
 * @param {string} producer - Nom du worker producteur
 * @param {object} payload - Données métier
 */
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

  // MAXLEN ~500k to prevent unbounded memory growth
  await redis.xAdd(
    streamName,
    '*', // auto-generate Redis stream ID
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
