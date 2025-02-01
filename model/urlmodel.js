const mongoose = require('mongoose')

const urlData = new mongoose.Schema({
    userId:{
        type:String,
        required:[true,"UserID is required"]
    },
    urlId: {
        type: String,
        required: [true, "ID is required"]
    },
    originalUrl: {
        type: String,
        required: [true, "LongUrl is required"]
    },
    shortUrl: {
        type: String,
        required: [true, "shortUrl is required"]
    },
    clicks: {
        type: Number,
        required: true,
        default: 0,
    },
    
    totalClicks: { type: Number, default: 0 },
    remainingClicks: { type: Number, default: 5 },
    date: {
        type: Date,
        default: Date.now
    },
    requestCount: { type: Number, default: 0 }, // New field for rate limiting
    lastRequestTime: { type: Date, default: Date.now },
    topic:{
        type:String,
        required:true
    }, // 
})


const UrlData = mongoose.model("URLdata", urlData);
module.exports = UrlData;
