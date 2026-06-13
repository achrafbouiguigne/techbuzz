const { getRedisClient } = require('../src/config/redis');

async function check() {
  const redis = await getRedisClient();
  const dlqStreams = [
    'events:PostCollected:dlq',
    'events:PostFilteredAsIT:dlq',
    'events:PostEnriched:dlq'
  ];

  for (const stream of dlqStreams) {
    try {
      const len = await redis.xLen(stream);
      console.log(`DLQ Stream "${stream}" length: ${len}`);
      if (len > 0) {
        const msgs = await redis.xRange(stream, '-', '+', { COUNT: 5 });
        console.log(`First 5 DLQ messages in ${stream}:`);
        msgs.forEach(m => {
          console.log(`- ID: ${m.id}`);
          console.log(`  Payload:`, JSON.stringify(m.message));
        });
      }
    } catch (err) {
      console.log(`DLQ Stream "${stream}" error/does not exist: ${err.message}`);
    }
  }

  
  try {
    const pending = await redis.xPending('events:PostFilteredAsIT', 'nlp-group');
    console.log(`Pending count in events:PostFilteredAsIT: ${pending.pending}`);
    if (pending.pending > 0) {
      console.log(`Min ID: ${pending.minId}, Max ID: ${pending.maxId}`);
    }
  } catch (err) {
    console.log(`xPending error: ${err.message}`);
  }
  
  process.exit(0);
}

check().catch(console.error);
