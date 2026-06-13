















const mongoose = require('mongoose');
const { Schema } = mongoose;





const KeywordSchema = new Schema({
    text:  { type: String, required: true },
    score: { type: Number, required: true }
}, { _id: false });

const PostMetricsSchema = new Schema({
    score:    { type: Number, default: 0 },  
    comments: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },  
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





const CATEGORIES = [
    'AI', 'Frontend', 'Backend', 'DevOps', 'Database',
    'Languages', 'Security', 'Mobile', 'DataEng', 'Other'
];

const EnrichedPostSchema = new Schema({
    
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

    
    title:     { type: String, default: '' },
    content:   { type: String, default: '' },
    author:    { type: String, default: '' },
    timestamp: { type: Date, required: true, index: -1 },
    metrics:   { type: PostMetricsSchema, default: () => ({}) },

    
    keywords: { type: [KeywordSchema], default: [] },

    
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

    
    
    
    embedding: {
        type: [Number],
        default: []
        
        
    },

    
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
    timestamps: true,        
    collection: 'enriched_posts',
    minimize: false          
});






EnrichedPostSchema.index(
    { external_id: 1, source: 1 },
    { unique: true, name: 'idx_external_source_unique' }
);


EnrichedPostSchema.index(
    { primary_category: 1, timestamp: -1 },
    { name: 'idx_category_timestamp' }
);


EnrichedPostSchema.index(
    { topic_id: 1, timestamp: -1 },
    { name: 'idx_topic_timestamp' }
);


EnrichedPostSchema.index(
    { 'keywords.text': 1 },
    { name: 'idx_keywords_text' }
);


EnrichedPostSchema.index(
    { confidence: 1 },
    { name: 'idx_confidence' }
);






EnrichedPostSchema.statics.upsertFromEvent = function (data) {
    return this.updateOne(
        { external_id: data.external_id, source: data.source },
        { $set: data },
        { upsert: true }
    );
};





const EnrichedPost = mongoose.model('EnrichedPost', EnrichedPostSchema);

module.exports = EnrichedPost;
module.exports.CATEGORIES = CATEGORIES;