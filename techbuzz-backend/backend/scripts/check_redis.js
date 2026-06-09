const { getRedisClient } = require('../src/config/redis');

async function check() {
  const redis = await getRedisClient();
  const streams = [
    'events:PostCollected',
    'events:PostFilteredAsIT',
    'events:PostEnriched'
  ];

  for (const stream of streams) {
    try {
      const len = await redis.xLen(stream);
      console.log(`Stream "${stream}" length: ${len}`);
      
      const groups = await redis.xInfoGroups(stream);
      console.log(`Groups for "${stream}":`);
      for (const group of groups) {
        console.log(`  - Name: "${group.name}", Consumers: ${group.consumers}, Pending: ${group.pending}, LastDeliveredId: ${group.lastDeliveredId}`);
      }
    } catch (err) {
      console.log(`Stream "${stream}" error: ${err.message}`);
    }
  }
  
  process.exit(0);
}

check().catch(console.error);
