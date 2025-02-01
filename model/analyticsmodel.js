const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userAgent: { type: String, required: true },
  ipAddress: { type: String, required: true },
  geolocation: {type:Object},
  osName: {type:String},
  deviceType: {type:String},
  urlId: { type: String, required: true } // Reference to the short URL ID
});

const AnalyticsData = mongoose.model('AnalyticsData', analyticsSchema);
module.exports = AnalyticsData;
