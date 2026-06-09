// ============================================================================
// InptPulse v2 — Persist Worker (MongoDB)
// ============================================================================

const { startConsumer } = require('../events/consumer');
const STREAMS = require('../events/streams');
const EnrichedPost = require('../models/EnrichedPost');
const { getRedisClient } = require('../config/redis');
const { decodeEmbedding } = require('../utils/serialization');
const { findMatchingTopic } = require('../services/topicMatcher');
const logger = require('../utils/logger');

async function handlePostEnriched(event) {
  const post = JSON.parse(event.data);
  const redis = await getRedisClient();

  // 1. Récupère le registre de centroïdes
  const registryRaw = await redis.get('topic_registry');
  const registry = registryRaw ? JSON.parse(registryRaw) : {};

  // 2. Décode l'embedding (base64 -> array of floats)
  const postEmbedding = decodeEmbedding(post.embedding);

  // 3. Stratégie B : trouve le topic le plus proche (> 0.7)
  const { topicId, score, label } = findMatchingTopic(postEmbedding, registry);

  // 4. Prépare le document final
  const finalDoc = {
    ...post,
    embedding: postEmbedding,
    topic_id: topicId,
    topic_label: label,
    topic_match_score: score,
    topic_assigned_at: topicId !== null ? new Date() : null
  };

  // 5. Pattern B Idempotence (Upsert MongoDB)
  // On n'utilise pas processed:group:eventId car upsert est naturellement idempotent.
  await EnrichedPost.upsertFromEvent(finalDoc);

  logger.info(`💾 Post ${post.external_id} saved to MongoDB. Topic assigned: ${topicId}`);
}

startConsumer(
  STREAMS.POST_ENRICHED,
  'persist-group',
  'persist-worker-1',
  handlePostEnriched,
  false // Pattern B: rely on MongoDB Upsert for idempotency
).catch(err => logger.error('Persist worker crashed:', err));
