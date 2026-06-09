const { getRedisClient } = require('../src/config/redis');

async function search() {
  const redis = await getRedisClient();
  const streams = ['events:PostCollected', 'events:PostFilteredAsIT', 'events:PostEnriched'];
  
  for (const stream of streams) {
    try {
      console.log(`Searching stream "${stream}"...`);
      let count = 0;
      let startId = '-';
      while (true) {
        const msgs = await redis.xRange(stream, startId, '+', { COUNT: 100 });
        if (msgs.length === 0) break;
        
        for (const m of msgs) {
          const data = m.message.data ? JSON.parse(m.message.data) : {};
          const text = `${data.title || ''} ${data.content || ''}`.toLowerCase();
          if (text.includes('morocco') || text.includes('france') || text.includes('arduino')) {
            console.log(`- Found in ${stream} (ID: ${m.id}):`);
            console.log(`  Title: "${data.title}"`);
            console.log(`  Content: "${data.content?.substring(0, 100)}..."`);
            count++;
          }
          startId = incrementId(m.id);
        }
        if (msgs.length < 100) break;
      }
      console.log(`Stream "${stream}" search done. Found ${count} matching posts.`);
    } catch (err) {
      console.log(`Error reading ${stream}:`, err);
    }
  }
  process.exit(0);
}

function incrementId(id) {
  const parts = id.split('-');
  return `${parts[0]}-${parseInt(parts[1]) + 1}`;
}

search().catch(console.error);
