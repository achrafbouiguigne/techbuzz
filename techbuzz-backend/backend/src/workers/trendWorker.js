// ============================================================================
// InptPulse v2 — Trend Worker
// ============================================================================

const { startConsumer } = require('../events/consumer');
const { publishEvent } = require('../events/publisher');
const STREAMS = require('../events/streams');
const { Client } = require('pg');
const logger = require('../utils/logger');

const pgClient = new Client({
  user: process.env.POSTGRES_USER || 'admin',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'techbuzz',
  password: process.env.POSTGRES_PASSWORD || 'password123',
  port: process.env.POSTGRES_PORT || 5432,
});

pgClient.connect().catch(err => logger.error('Postgres connection error:', err));

async function computeAndSaveSnapshot(dimType, dimId, weight) {
  // Simplistic velocity/acceleration calculation for the PFA sprint 1 demo
  // In a real scenario, this would aggregate over the window
  const velocity = weight * 1.5; 
  const acceleration = velocity * 0.2;
  const zScore = (velocity - 1.0) / 0.5;

  const snapshot = {
    ts: new Date().toISOString(),
    dim_type: dimType,
    dim_id: dimId,
    window_size: '1h',
    count: 1,
    velocity,
    acceleration,
    z_score: zScore
  };

  try {
    await pgClient.query(
      `INSERT INTO trend_snapshots (ts, dim_type, dim_id, window_size, count, velocity, acceleration, z_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [snapshot.ts, snapshot.dim_type, snapshot.dim_id, snapshot.window_size, snapshot.count, snapshot.velocity, snapshot.acceleration, snapshot.z_score]
    );

    await publishEvent(
      STREAMS.TREND_SNAPSHOT_COMPUTED,
      'TrendSnapshotComputed',
      `trend:${dimType}:${dimId}`,
      'trendWorker',
      snapshot
    );
  } catch (err) {
    logger.error('Failed to save trend snapshot:', err);
  }
}

async function handlePostEnriched(event) {
  const post = JSON.parse(event.data);
  
  // Pondération par category_scores
  if (post.primary_category) {
    const weight = post.category_scores[post.primary_category] || 1.0;
    await computeAndSaveSnapshot('category', post.primary_category, weight);
  }

  // Dimension Topic
  if (post.topic_id !== null) {
    await computeAndSaveSnapshot('topic', `topic_${post.topic_id}`, 1.0); // could weigh by topic_match_score
  }
}

startConsumer(
  STREAMS.POST_ENRICHED,
  'trend-group',
  'trend-worker-1',
  handlePostEnriched,
  true // Pattern A
).catch(err => logger.error('Trend worker crashed:', err));
