const axios = require('axios');

async function testQuery() {
  const query = `
    query GetLstmPredictions {
      predictTrends {
        keyword
        historical {
          date
          count
        }
        forecast {
          date
          count
        }
        confidenceScore
      }
    }
  `;

  try {
    console.log("Sending query to http://localhost:3001/graphql ...");
    const response = await axios.post('http://localhost:3001/graphql', { query });
    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error("Server responded with error:", error.response.status);
      console.error("Error details:", error.response.data);
    } else {
      console.error("Request failed:", error.message);
    }
  }
}

testQuery();
