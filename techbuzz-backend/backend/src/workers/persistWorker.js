



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

  
  const registryRaw = await redis.get('topic_registry');
  const registry = registryRaw ? JSON.parse(registryRaw) : {};

  
  const postEmbedding = decodeEmbedding(post.embedding);

  
  const { topicId, score, label } = findMatchingTopic(postEmbedding, registry);

  
  const finalDoc = {
    ...post,
    embedding: postEmbedding,
    topic_id: topicId,
    topic_label: label,
    topic_match_score: score,
    topic_assigned_at: topicId !== null ? new Date() : null
  };

  
  
  await EnrichedPost.upsertFromEvent(finalDoc);

  logger.info(`💾 Post ${post.external_id} saved to MongoDB. Topic assigned: ${topicId}`);
}

startConsumer(
  STREAMS.POST_ENRICHED,
  'persist-group',
  'persist-worker-1',
  handlePostEnriched,
  false 
).catch(err => logger.error('Persist worker crashed:', err));
