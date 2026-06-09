const { getRedisClient } = require('../src/config/redis');

async function check() {
  const redis = await getRedisClient();
  try {
    const rawGroups = await redis.xInfoGroups('events:PostFilteredAsIT');
    console.log('Raw groups info:', JSON.stringify(rawGroups, null, 2));

    const msgs = await redis.xRange('events:PostFilteredAsIT', '-', '+', { COUNT: 5 });
    console.log('First 5 messages in events:PostFilteredAsIT:');
    msgs.forEach(m => {
      console.log(`- ID: ${m.id}, eventId: ${m.message.eventId}, occurredAt: ${m.message.occurredAt}`);
    });

    const lastMsgs = await redis.xRevRange('events:PostFilteredAsIT', '+', '-', { COUNT: 5 });
    console.log('Last 5 messages in events:PostFilteredAsIT:');
    lastMsgs.forEach(m => {
      console.log(`- ID: ${m.id}, eventId: ${m.message.eventId}, occurredAt: ${m.message.occurredAt}`);
      const data = JSON.parse(m.message.data);
      console.log(`  Title: "${data.title}"`);
      console.log(`  Locations: ${JSON.stringify(data.locations)}`);
    });
  } catch (err) {
    console.log('Error:', err);
  }
  process.exit(0);
}

check().catch(console.error);
