const { extractKeywords }   = require('../services/trendService');
const { analyzeSentiment }  = require('../services/sentimentService');
const { getCategory }       = require('../services/categoryService');


function enrichPost(post) {
  
  const keywords = extractKeywords(post.title || post.content);

  
  const { sentiment, sentimentScore } = analyzeSentiment(post.title || post.content);

  
  const category = getCategory(keywords);

  
  const engagementScore = Math.log1p(post.scoreNorm || 0) *
    (1 + (post.upvoteRatio || 0)) *
    Math.log1p((post.numComments || 0) + 1);

  
  return {
    ...post,
    keywords,
    sentiment,
    sentimentScore,
    category,
    engagementScore: Math.round(engagementScore * 100) / 100,
    enrichedAt: new Date(),
  };
}

module.exports = { enrichPost };
