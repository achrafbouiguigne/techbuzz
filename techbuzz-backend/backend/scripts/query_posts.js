const connectDB = require('../src/config/db');
const EnrichedPost = require('../src/models/EnrichedPost');

async function check() {
  await connectDB();
  const count = await EnrichedPost.countDocuments();
  console.log(`Total enriched posts: ${count}`);

  const posts = await EnrichedPost.find().sort({ timestamp: -1 }).limit(10);
  console.log('Latest 10 posts:');
  posts.forEach(p => {
    console.log(`- Title: "${p.title}"\n  Category: ${p.primary_category}\n  Locations: ${JSON.stringify(p.locations)}\n  Companies: ${JSON.stringify(p.companies)}`);
  });
  
  const morocco = await EnrichedPost.find({
    $or: [
      { locations: /morocco/i },
      { locations: /maroc/i },
      { title: /morocco/i },
      { title: /maroc/i },
      { content: /morocco/i },
      { content: /maroc/i }
    ]
  });
  console.log(`Morocco posts count: ${morocco.length}`);
  morocco.forEach(p => {
    console.log(`- Morocco Post: "${p.title}" | Locations: ${JSON.stringify(p.locations)}`);
  });

  const france = await EnrichedPost.find({
    $or: [
      { locations: /france/i },
      { title: /france/i },
      { content: /france/i }
    ]
  });
  console.log(`France posts count: ${france.length}`);

  const arduino = await EnrichedPost.find({
    $or: [
      { title: /arduino/i },
      { content: /arduino/i }
    ]
  });
  console.log(`Arduino posts count: ${arduino.length}`);

  process.exit(0);
}

check().catch(console.error);
