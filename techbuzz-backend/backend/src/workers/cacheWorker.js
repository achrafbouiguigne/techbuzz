



const { startConsumer } = require('../events/consumer');
const STREAMS = require('../events/streams');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

async function handleTrendSnapshotComputed(event) {
  const snapshot = JSON.parse(event.data);
  const redis = await getRedisClient();

  
  const key = `trending:now:${snapshot.dim_type}:${snapshot.window_size}`;
  
  
  await redis.zAdd(key, [{ score: snapshot.velocity, value: snapshot.dim_id }]);
  
  
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
  false 
).catch(err => logger.error('Cache worker crashed:', err));
