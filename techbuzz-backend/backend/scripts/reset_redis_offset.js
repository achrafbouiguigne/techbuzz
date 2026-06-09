const { getRedisClient } = require('../src/config/redis');

async function reset() {
  const redis = await getRedisClient();
  try {
    // Reset nlp-group to the end of the stream ($)
    await redis.xGroupSetId('events:PostFilteredAsIT', 'nlp-group', '$');
    console.log('Successfully reset group "nlp-group" on "events:PostFilteredAsIT" to "$"');
    
    // Let's also check raw info
    const rawGroups = await redis.xInfoGroups('events:PostFilteredAsIT');
    console.log('Updated groups info:', JSON.stringify(rawGroups, null, 2));
  } catch (err) {
    console.log('Error resetting offset:', err);
  }
  process.exit(0);
}

reset().catch(console.error);
