const mongoose = require('mongoose');

const CleanPostSchema = new mongoose.Schema({
  redditId:    { type: String, required: true, unique: true },
  title:       { type: String, required: true },
  content:     { type: String }, 
  author:      { type: String },
  subreddit:   { type: String, required: true },
  scoreNorm:   { type: Number, default: 0 }, 
  upvoteRatio: { type: Number, default: 0 },
  numComments: { type: Number, default: 0 },
  url:         { type: String },
  flair:       { type: String },
  createdAt:   Date,
  cleanedAt:   { type: Date, default: Date.now }, 
}, {
  collection: 'posts_clean'
});

module.exports = mongoose.model('CleanPost', CleanPostSchema);
