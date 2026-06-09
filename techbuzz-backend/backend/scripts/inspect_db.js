const connectDB = require('../src/config/db');
const EnrichedPost = require('../src/models/EnrichedPost');

async function inspect() {
  await connectDB();
  const posts = await EnrichedPost.find({
    $or: [
      { title: /mongodb/i },
      { title: /nosql/i },
      { content: /mongodb/i },
      { content: /nosql/i }
    ]
  });
  console.log(`Found ${posts.length} posts matching MongoDB/NoSQL:`);
  posts.forEach(p => {
    console.log(`- ID: ${p.external_id}\n  Title: "${p.title}"\n  Category: ${p.primary_category}\n  Locations: ${JSON.stringify(p.locations)}`);
  });
  process.exit(0);
}

inspect().catch(console.error);
