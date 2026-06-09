// ============================================================================
// InptPulse v2 — Streams Registry
// ============================================================================
// Catalogue centralisé des 8 événements de l'Architecture Event-Driven
// ============================================================================

const STREAMS = {
  POST_COLLECTED: 'events:PostCollected',
  POST_FILTERED_IT: 'events:PostFilteredAsIT',
  POST_FILTERED_NON_IT: 'events:PostFilteredAsNonIT',
  POST_ENRICHED: 'events:PostEnriched',
  TREND_SNAPSHOT_COMPUTED: 'events:TrendSnapshotComputed',
  TOPIC_BATCH_COMPLETED: 'events:TopicAssignmentBatchCompleted',
  PREDICTION_TRIGGERED: 'events:PredictionCycleTriggered',
  PREDICTION_EMITTED: 'events:PredictionEmitted'
};

module.exports = STREAMS;
