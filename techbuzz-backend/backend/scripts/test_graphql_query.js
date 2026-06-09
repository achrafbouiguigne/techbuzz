const axios = require('axios');

async function testQuery() {
  console.log("Sending predictTrends GraphQL query...");
  try {
    const response = await axios.post('http://localhost:3001/graphql', {
      query: `
        query GetLstmPredictions {
          predictTrends {
            keyword
            confidenceScore
          }
        }
      `
    }, { timeout: 15000 });
    
    console.log("RESPONSE SUCCESS:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("RESPONSE ERROR:", err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("NETWORK/TIMEOUT ERROR:", err.message);
    }
  }
}

testQuery();
