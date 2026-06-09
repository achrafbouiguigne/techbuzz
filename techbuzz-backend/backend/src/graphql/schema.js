const { gql } = require('graphql-tag');

const typeDefs = gql`
  type TopPost {
    title: String
    score: Int
    url: String
  }

  type Trend {
    keyword: String
    count: Int
    totalScore: Int
    avgScore: Int
    totalComments: Int
    momentum: Int          
    avgSentiment: Float    
    subreddits: [String]
    topPost: TopPost
  }

  type TrendSnapshot {
    keyword: String
    count: Int
    totalScore: Int
    avgScore: Int
    momentum: Int
    avgSentiment: Float
    category: String
    snapshotAt: String
  }

  type Keyword {
    text: String
    score: Float
  }

  type EnrichedPost {
    external_id: String
    title: String
    content: String
    primary_category: String
    confidence: Float
    companies: [String]
    locations: [String]
    timestamp: String
    keywords: [Keyword]
  }

  type RoadmapNode {
    name: String!
    type: String!
    description: String!
  }

  type AIInsight {
    framework: String
    details: String
    roadmap: [RoadmapNode]
  }

  type DailyForecast {
    date: String
    count: Float
  }

  type TrendPrediction {
    keyword: String
    historical: [DailyForecast]
    forecast: [DailyForecast]
    confidenceScore: Float
  }

  type Query {
    currentTrends: [Trend]
    history(limit: Int): [EnrichedPost]
    enrichedPosts(company: String, location: String, limit: Int): [EnrichedPost]
    trendHistory(keyword: String!, days: Int): [TrendSnapshot]
    allSnapshots(days: Int): [TrendSnapshot]
    aiRecommendation(country: String!, domain: String!): AIInsight
    predictTrends(daysAhead: Int): [TrendPrediction]
    totalPostCount: Int
  }

  type Subscription {
    trendsUpdated: [Trend]
  }
`;

module.exports = { typeDefs };