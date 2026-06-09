const { getRedisClient } = require('../src/config/redis');

async function check() {
  const redis = await getRedisClient();
  try {
    const consumers = await redis.xInfoConsumers('events:PostFilteredAsIT', 'nlp-group');
    console.log('Consumers info:', JSON.stringify(consumers, null, 2));

    const pending = await redis.xPendingRange('events:PostFilteredAsIT', 'nlp-group', '-', '+', 10);
    console.log('First 10 pending messages:', JSON.stringify(pending, null, 2));
  } catch (err) {
    console.log('Error:', err);
  }
  process.exit(0);
}

check().catch(console.error);
