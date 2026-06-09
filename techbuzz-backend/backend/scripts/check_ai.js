require('dotenv').config();
const { getAIRecommendation } = require('../src/services/aiService');
const { connectRedis } = require('../src/config/redis');

async function test() {
  console.log('Connecting to Redis (needed for trends context)...');
  await connectRedis();

  console.log('Testing getAIRecommendation with Morocco and Mobile...');
  const res = await getAIRecommendation('Morocco', 'Mobile');
  console.log('Result:', res);

  console.log('\nTesting getAIRecommendation with USA and Backend...');
  const res2 = await getAIRecommendation('USA', 'Backend');
  console.log('Result:', res2);

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
