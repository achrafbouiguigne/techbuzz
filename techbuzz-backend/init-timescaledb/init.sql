
CREATE EXTENSION IF NOT EXISTS timescaledb;

DROP TABLE IF EXISTS trend_snapshots CASCADE;
DROP TABLE IF EXISTS trend_predictions CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;


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
SELECT create_hypertable('trend_snapshots', 'ts');
CREATE INDEX ON trend_snapshots (dim_type, dim_id, ts DESC);


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
SELECT create_hypertable('predictions', 'ts');
CREATE INDEX ON predictions (dim_type, dim_id, predicted_at DESC);