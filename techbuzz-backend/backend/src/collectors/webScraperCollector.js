const axios = require('axios');
const { getCategory } = require('../services/categoryService');
const { publishEvent } = require('../events/publisher');
const STREAMS = require('../events/streams');
const RawPost = require('../models/RawPost');
const logger = require('../utils/logger');
const { isTechnicallyRelevant } = require('./redditCollector');




async function fetchDevToArticles(tag, limit = 15, page = 1) {
  try {
    const url = `https://dev.to/api/articles?tag=${tag}&per_page=${limit}&page=${page}`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'TechBuzzTracker/1.0 (educational project)' },
      timeout: 10000
    });

    if (!Array.isArray(res.data)) {
      logger.warn(`[Scraper] Dev.to API retu
        
        
        
        
        
        rned invalid payload for tag=${tag}`);
      return [];
    }

    return res.data.map(article => {
      
      const tags = article.tag_list || [];
      const category = getCategory([...tags, tag]);

      return {
        redditId: `devto_${article.id}`,
        title: article.title,
        content: article.description || article.title,
        author: article.user?.username || 'devto_user',
        subreddit: tag, 
        scoreRaw: article.public_reactions_count || 10,
        scoreNorm: Math.max(0, article.public_reactions_count || 10),
        upvoteRatio: 1.0,
        numComments: article.comments_count || 0,
        url: article.url,
        flair: null,
        createdAt: new Date(article.published_at),
        collectedAt: new Date(),
        category,
      };
    });
  } catch (err) {
    logger.error(`[Scraper] Dev.to error tag=${tag}:`, err.message);
    return [];
  }
}




async function fetchHackerNewsStories(limit = 30) {
  try {
    const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=${limit}`;
    const res = await axios.get(url, { timeout: 10000 });

    if (!res.data || !Array.isArray(res.data.hits)) {
      logger.warn(`[Scraper] HN Algolia Search returned invalid payload`);
      return [];
    }

    return res.data.hits.map(hit => {
      
      const titleLower = (hit.title || '').toLowerCase();
      const keywords = titleLower.split(/\b/);
      const category = getCategory(keywords);

      
      const subreddit = category === 'Other' ? 'programming' : category.toLowerCase();

      return {
        redditId: `hn_${hit.objectID}`,
        title: hit.title || 'Untitled HN Post',
        content: hit.story_text || hit.title || '',
        author: hit.author || 'hn_user',
        subreddit, 
        scoreRaw: hit.points || 10,
        scoreNorm: Math.max(0, hit.points || 10),
        upvoteRatio: 1.0,
        numComments: hit.num_comments || 0,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        flair: null,
        createdAt: hit.created_at ? new Date(hit.created_at) : new Date(),
        collectedAt: new Date(),
        category,
      };
    });
  } catch (err) {
    logger.error(`[Scraper] Hacker News error:`, err.message);
    return [];
  }
}




async function saveRawPost(post) {
  try {
    const doc = new RawPost({
      redditId: post.redditId,
      title: post.title,
      content: post.content,
      author: post.author,
      subreddit: post.subreddit,
      scoreRaw: post.scoreRaw,
      upvoteRatio: post.upvoteRatio,
      numComments: post.numComments,
      url: post.url,
      flair: post.flair,
      createdAt: post.createdAt,
      collectedAt: post.collectedAt,
      category: post.category,
    });

    await doc.save();
    logger.debug(`[DB] Scraped Post ${post.redditId} inserted in posts_raw`);
  } catch (err) {
    if (err.code === 11000) {
      logger.debug(`[DB] Scraped Post ${post.redditId} already exists (skipping)`);
    } else {
      logger.error(`[DB] Error inserting scraped post ${post.redditId}:`, err.message);
    }
  }
}




async function fetchWebScraperPosts() {
  logger.info(`[Scraper] Starting Web Scraper collect (Dev.to & Hacker News)...`);

  const tags = [
    'programming', 'webdev', 'devops', 'machinelearning', 'databases',
    'javascript', 'python', 'react', 'node', 'typescript',
    'rust', 'golang', 'aws', 'docker', 'kubernetes'
  ];
  const allScraped = [];

  
  const page = Math.floor(Math.random() * 5) + 1;

  
  for (const tag of tags) {
    logger.info(`[Scraper] Fetching Dev.to tag: ${tag} (page ${page})...`);
    const articles = await fetchDevToArticles(tag, 15, page);
    allScraped.push(...articles);
    
    await new Promise(res => setTimeout(res, 500));
  }

  
  logger.info(`[Scraper] Fetching Hacker News trending articles...`);
  const hnStories = await fetchHackerNewsStories();
  allScraped.push(...hnStories);

  logger.info(`[Scraper] Total raw posts scraped: ${allScraped.length}`);

  
  let filteredCount = 0;
  const relevantPosts = allScraped.filter(post => {
    const check = isTechnicallyRelevant(post);
    if (!check.relevant) {
      filteredCount++;
      logger.debug(`[Scraper Filter] Rejected [${check.reason}]: "${post.title.slice(0, 60)}..."`);
      return false;
    }
    return true;
  });

  logger.info(`[Scraper] Pertinents: ${relevantPosts.length} | Rejected: ${filteredCount}`);

  
  if (relevantPosts.length > 0) {
    let sentCount = 0;
    let errorCount = 0;
    for (const post of relevantPosts) {
      try {
        const payload = {
          source: 'reddit',
          external_id: post.redditId,
          title: post.title,
          content: post.content || '',
          author: post.author || 'web_scraper',
          timestamp: post.createdAt ? post.createdAt.toISOString() : new Date().toISOString(),
          metrics: {
            score: post.scoreRaw || 0,
            comments: post.numComments || 0
          }
        };

        await publishEvent(
          STREAMS.POST_COLLECTED,
          'PostCollected',
          `post:reddit:${payload.external_id}`,
          'web-scraper-collector',
          payload
        );
        sentCount++;
      } catch (streamErr) {
        logger.error(`[Stream] Scraper error sending post ${post.redditId}:`, streamErr.message);
        errorCount++;
      }
    }
    logger.info(`[Stream] Scraper → ${sentCount} posts sent to Redis Stream (errors: ${errorCount})`);
  }

  
  for (const post of allScraped) {
    await saveRawPost(post);
  }

  return relevantPosts;
}

module.exports = {
  fetchWebScraperPosts
};
