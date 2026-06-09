// ============================================================================
// InptPulse v2 — EnrichedPost Mongoose Model
// ============================================================================
// Document représentant un post enrichi (Twitter ou Reddit) après passage
// par tout le pipeline NLP (KeyBERT + zero-shot multi-label + embedding).
//
// Producteurs : persistWorker (au reçu de PostEnriched)
//               topic-modeler (update du topic_id rétroactif en batch)
//
// Conventions :
//   - external_id + source = clé naturelle unique (utilisée pour l'upsert)
//   - embedding stocké en array de floats (le base64 est uniquement pour
//     le transit dans les events, on décode avant de stocker)
//   - topic_id nullable : null tant qu'aucun match (Stratégie B) ou batch
// ============================================================================

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ----------------------------------------------------------------------------
// Sous-schemas (sans _id pour éviter les sous-IDs inutiles)
// ----------------------------------------------------------------------------

const KeywordSchema = new Schema({
    text:  { type: String, required: true },
    score: { type: Number, required: true }
}, { _id: false });

const PostMetricsSchema = new Schema({
    score:    { type: Number, default: 0 },  // Reddit upvotes
    comments: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },  // Twitter
    likes:    { type: Number, default: 0 }
}, { _id: false });

const CategoryScoresSchema = new Schema({
    AI:        { type: Number, default: 0 },
    Frontend:  { type: Number, default: 0 },
    Backend:   { type: Number, default: 0 },
    DevOps:    { type: Number, default: 0 },
    Database:  { type: Number, default: 0 },
    Languages: { type: Number, default: 0 },
    Security:  { type: Number, default: 0 },
    Mobile:    { type: Number, default: 0 },
    DataEng:   { type: Number, default: 0 }
}, { _id: false });

// ----------------------------------------------------------------------------
// Schema principal
// ----------------------------------------------------------------------------

const CATEGORIES = [
    'AI', 'Frontend', 'Backend', 'DevOps', 'Database',
    'Languages', 'Security', 'Mobile', 'DataEng', 'Other'
];

const EnrichedPostSchema = new Schema({
    // ---- Identité du post (source + id natif) ----
    source: {
        type: String,
        enum: ['twitter', 'reddit'],
        required: true,
        index: true
    },
    external_id: {
        type: String,
        required: true
    },

    // ---- Contenu brut ----
    title:     { type: String, default: '' },
    content:   { type: String, default: '' },
    author:    { type: String, default: '' },
    timestamp: { type: Date, required: true, index: -1 },
    metrics:   { type: PostMetricsSchema, default: () => ({}) },

    // ---- Enrichissement KeyBERT ----
    keywords: { type: [KeywordSchema], default: [] },

    // ---- Enrichissement zero-shot multi-label ----
    primary_category: {
        type: String,
        enum: CATEGORIES,
        required: true,
        index: true
    },
    secondary_categories: {
        type: [String],
        enum: CATEGORIES,
        default: []
    },
    category_scores: {
        type: CategoryScoresSchema,
        required: true,
        default: () => ({})
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },

    // ---- Job Seeker Features ----
    companies: {
        type: [String],
        default: [],
        index: true
    },
    locations: {
        type: [String],
        default: [],
        index: true
    },

    // ---- Embedding sémantique (384 floats, all-MiniLM-L6-v2) ----
    // Note : stocké en array de floats côté Mongo, encodé en base64
    // uniquement pour le transit dans les events.
    embedding: {
        type: [Number],
        default: []
        // Pas d'index, c'est trop lourd. Pour la recherche par similarité,
        // on passe par BERTopic + le registre Redis.
    },

    // ---- Topic (assigné par Stratégie B en temps réel ou par batch) ----
    topic_id: {
        type: Number,
        default: null,
        index: true
    },
    topic_label: {
        type: String,
        default: null
    },
    topic_match_score: {
        type: Number,
        default: null,
        min: 0,
        max: 1
    },
    topic_assigned_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,        // createdAt / updatedAt automatiques
    collection: 'enriched_posts',
    minimize: false          // garde les sous-objets vides au lieu de les omettre
});

// ----------------------------------------------------------------------------
// Index composés (au-delà des index inline ci-dessus)
// ----------------------------------------------------------------------------

// Clé naturelle unique : permet upsert idempotent (Pattern B du persistWorker)
EnrichedPostSchema.index(
    { external_id: 1, source: 1 },
    { unique: true, name: 'idx_external_source_unique' }
);

// Listing par catégorie chronologique (pour frontend / GraphQL posts())
EnrichedPostSchema.index(
    { primary_category: 1, timestamp: -1 },
    { name: 'idx_category_timestamp' }
);

// Listing par topic chronologique
EnrichedPostSchema.index(
    { topic_id: 1, timestamp: -1 },
    { name: 'idx_topic_timestamp' }
);

// Recherche par keyword (text index full-text simple)
EnrichedPostSchema.index(
    { 'keywords.text': 1 },
    { name: 'idx_keywords_text' }
);

// Filtre par confidence (pour analyses avancées)
EnrichedPostSchema.index(
    { confidence: 1 },
    { name: 'idx_confidence' }
);

// ----------------------------------------------------------------------------
// Méthodes utiles
// ----------------------------------------------------------------------------

/**
 * Upsert idempotent à partir du payload reçu dans un événement PostEnriched.
 * Pattern B d'idempotence : updateOne avec upsert sur la clé naturelle.
 *
 * @param {Object} data - payload du PostEnriched (déjà décodé, embedding en array)
 * @returns {Promise} résultat de updateOne
 */
EnrichedPostSchema.statics.upsertFromEvent = function (data) {
    return this.updateOne(
        { external_id: data.external_id, source: data.source },
        { $set: data },
        { upsert: true }
    );
};

// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

const EnrichedPost = mongoose.model('EnrichedPost', EnrichedPostSchema);

module.exports = EnrichedPost;
module.exports.CATEGORIES = CATEGORIES;