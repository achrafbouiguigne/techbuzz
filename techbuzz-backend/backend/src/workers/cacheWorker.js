// ============================================================================
// InptPulse v2 — Cache Worker
// ============================================================================

const { startConsumer } = require('../events/consumer');
const STREAMS = require('../events/streams');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

async function handleTrendSnapshotComputed(event) {
  const snapshot = JSON.parse(event.data);
  const redis = await getRedisClient();

  // Mettre à jour la clé Redis pour le trending:now
  const key = `trending:now:${snapshot.dim_type}:${snapshot.window_size}`;
  
  // On utilise un Sorted Set (ZSET) pour stocker les trends classés par velocité
  await redis.zAdd(key, [{ score: snapshot.velocity, value: snapshot.dim_id }]);
  
  // Si c'est un topic émergent (z_score > 2), on l'ajoute à la liste emerging
  if (snapshot.dim_type === 'topic' && snapshot.z_score > 2.0) {
    await redis.zAdd(`trending:now:emerging:24h`, [{ score: snapshot.z_score, value: snapshot.dim_id }]);
  }

  logger.debug(`🔥 Updated cache for ${snapshot.dim_type} ${snapshot.dim_id}`);
}

startConsumer(
  STREAMS.TREND_SNAPSHOT_COMPUTED,
  'cache-group',
  'cache-worker-1',
  handleTrendSnapshotComputed,
  false // Pattern C: double processing is fine since it overwrites Redis keys
).catch(err => logger.error('Cache worker crashed:', err));
