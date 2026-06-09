require('dotenv').config();
const mongoose = require('mongoose');
const { Client } = require('pg');

async function resetDb() {
  console.log('🔄 Wiping databases for InptPulse v2...');
  
  // MongoDB
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://admin:password123@localhost:27017/techbuzz?authSource=admin';
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.dropDatabase();
    console.log('✅ MongoDB techbuzz database dropped.');
  } catch (err) {
    console.error('❌ MongoDB reset error:', err.message);
  } finally {
    await mongoose.disconnect();
  }

  // TimescaleDB
  const client = new Client({
    user: process.env.POSTGRES_USER || 'admin',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'techbuzz',
    password: process.env.POSTGRES_PASSWORD || 'password123',
    port: process.env.POSTGRES_PORT || 5432,
  });

  try {
    await client.connect();
    // Drop existing tables
    await client.query('DROP TABLE IF EXISTS trend_snapshots CASCADE');
    await client.query('DROP TABLE IF EXISTS predictions CASCADE');
    await client.query('DROP TABLE IF EXISTS trend_predictions CASCADE'); // from v1
    
    // Recreate the tables
    await client.query(`
      CREATE TABLE trend_snapshots (
        ts           TIMESTAMPTZ NOT NULL,
        dim_type     TEXT NOT NULL,         
        dim_id       TEXT NOT NULL,         
        window_size  TEXT NOT NULL,         
        count        INTEGER,
        velocity     DOUBLE PRECISION,
        acceleration DOUBLE PRECISION,
        z_score      DOUBLE PRECISION
      );
      SELECT create_hypertable('trend_snapshots', 'ts', if_not_exists => TRUE);
      CREATE INDEX ON trend_snapshots (dim_type, dim_id, ts DESC);
    `);
    
    await client.query(`
      CREATE TABLE predictions (
        ts            TIMESTAMPTZ NOT NULL,
        dim_type      TEXT NOT NULL,
        dim_id        TEXT NOT NULL,
        cycle_id      TEXT NOT NULL,
        predicted_at  TIMESTAMPTZ NOT NULL,
        yhat          DOUBLE PRECISION,
        yhat_lower    DOUBLE PRECISION,
        yhat_upper    DOUBLE PRECISION,
        model_type    TEXT
      );
      SELECT create_hypertable('predictions', 'ts', if_not_exists => TRUE);
      CREATE INDEX ON predictions (dim_type, dim_id, predicted_at DESC);
    `);

    console.log('✅ TimescaleDB tables wiped and recreated for v2.');
  } catch (err) {
    console.error('❌ TimescaleDB reset error:', err.message);
  } finally {
    await client.end();
  }

  console.log('🎉 Reset complete.');
  process.exit(0);
}

resetDb();
