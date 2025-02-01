const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');
const UrlData = require("../model/urlmodel")
const axios = require('axios');
const UAParser = require('ua-parser-js');
const dotenv = require("dotenv")
dotenv.config()


const shortenUrl = (originalUrl, urlId) => {
  const baseUrl = 'http://short.url/';
  return `${baseUrl}${urlId}`;
};
const maxRequest = 10;

// Create rate limiter middleware
const createAccountLimiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_URL,
    collectionName: 'urldatas'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: maxRequest,
  handler: async (req, res) => {
    console.log('Rate limit handler invoked');
    const { originalUrl } = req.body;
    const urlData = await UrlData.findOne({ originalUrl });
    if (urlData) {
      urlData.requestCount++;
      urlData.lastRequestTime = Date.now();
      await urlData.save();
    }
    res.status(429).json({
      status: 429,
      message: 'Too many accounts created from this IP, please try again after an hour'
    });
  }
});
const validateUrl =(value)=>{
  const urlRegex = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
  return urlRegex.test(value);
}



const  getGeolocation =async (ip)=> {
  try {
    const response = await axios.get(`https://api64.ipify.org?format=json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching geolocation data:',error);
    return null;
  }
}


const getUserAgentDetails = (userAgent) => {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    console.log("Parsed User-Agent Result:", result); // Log the parsed result for debugging
    const osName = result.os.name || "Unknown";
    const deviceType = result.device.type || "desktop";
    return { osName, deviceType };
  } catch (error) {
    console.error("Error parsing user agent:", error);
    return { osName: "Unknown", deviceType: "Unknown" };
  }
};

module.exports = {
  shortenUrl,
  createAccountLimiter,
  maxRequest, 
  validateUrl,
  getGeolocation,
  getUserAgentDetails
  
};
