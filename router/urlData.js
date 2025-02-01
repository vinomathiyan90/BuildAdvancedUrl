const express = require("express")
const router = express.Router();
const UrlData = require("../model/urlmodel");
const AnalyticsData = require("../model/analyticsmodel")
const nanoid = require('nanoid');
const authenticateUser = require("../middleware/jwtverify")
const { shortenUrl, createAccountLimiter, maxRequest, validateUrl, getGeolocation, getUserAgentDetails } = require("../middleware/shortUrlverify");//longurl and baseurl 



//store urlData - api/short
router.post('/api/short',createAccountLimiter, authenticateUser.verifyJwtMiddleware, async (req, res) => {
  const userId = req.userId; // Extract user ID from verified token
  console.log('Authenticated User ID:', userId);
  const {originalUrl,topic} = req.body
      
  // Validate originalUrl 
  if (!validateUrl(originalUrl)) {
    console.log('Invalid URL:', originalUrl);
    }
  try {

     const urlId = nanoid(10)
    let result = await UrlData.findOne({ originalUrl });
    console.log(result)
    if (result) {
      res.json({ status: 200, data: result });
    } else {
      let shortURL = shortenUrl(originalUrl, urlId);
      console.log(shortURL)
      const newUrl = await UrlData.create({
        userId: String(userId),
        originalUrl: originalUrl,
        shortUrl: shortURL,
        urlId: urlId,
        clicks: 0,
        totalClicks: 0,
        remainingClicks: maxRequest,
        topic: topic,
        requestCount: 1,
        lastRequestTime: Date.now(),
        date: new Date()
      });

      res.json({ status: 200, data: newUrl });
    }
  } catch (error) {
    res.status(500).json({ status: 500, msg: "An error occurred while processing the request" });
  }
});

  //  store analytics Data with geolocation api/shorten/
router.get("/api/shorten/:urlId", async (req, res) => {
  const { urlId } = req.params;
  console.log(urlId)

  try {
    const result = await UrlData.findOne({ urlId });
    console.log(result)
    if (result) {

      const { osName, deviceType } = getUserAgentDetails(req.get('User-Agent'));
      console.log(osName, deviceType)
      if (result.remainingClicks > 0) {
        const geolocation = await getGeolocation(req.ip);
        const analyticsData = new AnalyticsData({
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          geolocation: geolocation,
          osName: osName,
          deviceType: deviceType,
          urlId: urlId
        });

        await analyticsData.save(); // Save analytics data
        console.log("saved")

        const updatedResult = await UrlData.findOneAndUpdate(
          { urlId },
          {
            $inc: { clicks: 1, totalClicks: 1 },
            $set: { remainingClicks: result.remainingClicks - 1 }
          },
          { new: true }
        );
        const originalUrl = decodeURIComponent(updatedResult.originalUrl);
        console.log(`Redirecting to: ${originalUrl}`);
        return res.redirect(originalUrl);
      } else {
        return res.status(429).json({
          status: 429,
          message: "Too many clicks for this URL, please try again after the rate limit window"
        });
      }
    } else {
      return res.status(404).json({
        status: 404,
        message: "URL not found"
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while processing the request"
    });
  }

});



// get analytics data - api/analytics
router.get('/api/analytics/:urlId', async (req, res) => {
  const { urlId } = req.params;

  try {
    const totalClicks = await AnalyticsData.countDocuments({ urlId });
    const uniqueUsers = await AnalyticsData.distinct('ipAddress', { urlId });

    // Calculate clicks by date for the recent 7 days
    const dateNow = new Date();
    const last7Days = [...Array(7).keys()].map(i => {
      const date = new Date(dateNow);
      date.setDate(dateNow.getDate() - i);
      return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    });

    const clicksByDate = await Promise.all(
      last7Days.map(async (date) => {
        const count = await AnalyticsData.countDocuments({
          urlId,
          timestamp: {
            $gte: new Date(`${date}T00:00:00Z`),
            $lt: new Date(`${date}T23:59:59Z`)
          }
        });
        return { date, count };
      })
    );

    // Calculate unique clicks and unique users by OS
    const osType = await AnalyticsData.aggregate([
      { $match: { urlId } },
      {
        $group: {
          _id: { osName: "$osName" },
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: "$ipAddress" }
        }
      },
      {
        $project: {
          osName: "$_id.osName",
          uniqueClicks: 1,
          uniqueUsers: { $size: "$uniqueUsers" }
        }
      }
    ]);

    // Calculate unique clicks and unique users by device type
    const deviceType = await AnalyticsData.aggregate([
      { $match: { urlId } },
      {
        $group: {
          _id: { deviceType: "$deviceType" },
          uniqueClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: "$ipAddress" }
        }
      },
      {
        $project: {
          deviceName: "$_id.deviceType",
          uniqueClicks: 1,
          uniqueUsers: { $size: "$uniqueUsers" }
        }
      }
    ]);

    const analyticsDetails = {
      urlId: urlId,
      totalClicks: totalClicks,
      uniqueUsers: uniqueUsers.length,
      clicksByDate: clicksByDate,
      osType: osType,
      deviceType: deviceType,
    };

    return res.status(200).json(analyticsDetails);
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving analytics data",
    });
  }
});

//  get topic wise get analytics data - api/ analytics/topic
router.get('/api/analytics/topic/:topic', async (req, res) => {
  const { topic } = req.params;
  console.log(topic)
  try {
    // Find all URLs under the specified topic
    const urls = await UrlData.find({ topic });


    // Aggregate total clicks for the topic
    const totalClicks = await AnalyticsData.countDocuments({ urlId: { $in: urls.map(url => url.urlId) } });
    const uniqueUsers = await AnalyticsData.distinct('ipAddress', { urlId: { $in: urls.map(url => url.urlId) } });

    // Calculate clicks by date for all URLs under the topic
    const dateNow = new Date();
    const last7Days = [...Array(7).keys()].map(i => {
      const date = new Date(dateNow);
      date.setDate(dateNow.getDate() - i);
      return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    });

    const clicksByDate = await Promise.all(
      last7Days.map(async (date) => {
        const count = await AnalyticsData.countDocuments({
          urlId: { $in: urls.map(url => url.urlId) },
          timestamp: {
            $gte: new Date(`${date}T00:00:00Z`),
            $lt: new Date(`${date}T23:59:59Z`)
          }
        });
        return { date, count };
      })
    );

    // Gather details for each short URL under the topic
    const urlDetails = await Promise.all(
      urls.map(async (url) => {
        const urlTotalClicks = await AnalyticsData.countDocuments({ urlId: url.urlId });
        const urlUniqueUsers = await AnalyticsData.distinct('ipAddress', { urlId: url.urlId });
        return {
          shortUrl: url.shortUrl,
          totalClicks: urlTotalClicks,
          uniqueUsers: urlUniqueUsers.length,
        };
      })
    );

    const analyticsDetails = {
      totalClicks: totalClicks,
      uniqueUsers: uniqueUsers.length,
      clicksByDate: clicksByDate,
      urls: urlDetails,
    };

    return res.status(200).json(analyticsDetails);
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving analytics data",
    });
  }
});


// over all analytics data - analytics/overall
router.get('/analytics/overall', authenticateUser.verifyJwtMiddleware, async (req, res) => {
  const userId = req.query.userId; // Extract user ID from query parameters
  console.log('Extracted User ID:', userId);

  try {
      // Ensure userId is a string
      const userIdString = String(userId);
      console.log("Converted User ID to String:", userIdString);

      // Fetch URLs for the authenticated user
      const urls = await UrlData.find({ userId: userIdString }).exec();
      console.log('Matching URLs:', urls);

      // Calculate total number of URLs
      const totalUrls = urls.length;
      let totalClicks = 0;
      let uniqueUsersSet = new Set();

      // Details for each URL
      const urlDetails = await Promise.all(
          urls.map(async (url) => {
              const urlTotalClicks = await AnalyticsData.countDocuments({ urlId: url.urlId });
              const urlUniqueUsers = await AnalyticsData.distinct('ipAddress', { urlId: url.urlId });

              // Update total clicks
              totalClicks += urlTotalClicks;

              // Update unique users set
              urlUniqueUsers.forEach(ip => uniqueUsersSet.add(ip));

              return {
                  shortUrl: url.shortUrl,
                  totalClicks: urlTotalClicks,
                  uniqueUsers: urlUniqueUsers.length,
              };
          })
      );

      const uniqueUsers = uniqueUsersSet.size;

      // Calculate clicks by date for all URLs
      const dateNow = new Date();
      const last7Days = [...Array(7).keys()].map(i => {
          const date = new Date(dateNow);
          date.setDate(dateNow.getDate() - i);
          return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      });

      const clicksByDate = await Promise.all(
          last7Days.map(async (date) => {
              const count = await AnalyticsData.countDocuments({
                  urlId: { $in: urls.map(url => url.urlId) },
                  timestamp: {
                      $gte: new Date(`${date}T00:00:00Z`),
                      $lt: new Date(`${date}T23:59:59Z`)
                  }
              });
              return { date, count };
          })
      );

      // Aggregate unique clicks and unique users by OS
      const osType = await AnalyticsData.aggregate([
          { $match: { urlId: { $in: urls.map(url => url.urlId) } } },
          {
              $group: {
                  _id: { osName: "$osName" },
                  uniqueClicks: { $sum: 1 },
                  uniqueUsers: { $addToSet: "$ipAddress" }
              }
          },
          {
              $project: {
                  osName: "$_id.osName",
                  uniqueClicks: 1,
                  uniqueUsers: { $size: "$uniqueUsers" }
              }
          }
      ]);
      console.log("osType", osType);

      // Aggregate unique clicks and unique users by device type
      const deviceType = await AnalyticsData.aggregate([
          { $match: { urlId: { $in: urls.map(url => url.urlId) } } },
          {
              $group: {
                  _id: { deviceType: "$deviceType" },
                  uniqueClicks: { $sum: 1 },
                  uniqueUsers: { $addToSet: "$ipAddress" }
              }
          },
          {
              $project: {
                  deviceName: "$_id.deviceType",
                  uniqueClicks: 1,
                  uniqueUsers: { $size: "$uniqueUsers" }
              }
          }
      ]);
      console.log("deviceType", deviceType);

      const analyticsDetails = {
          totalUrls: totalUrls,
          totalClicks: totalClicks,
          uniqueUsers: uniqueUsers,
          clicksByDate: clicksByDate,
          osType: osType,
          deviceType: deviceType,
          urls: urlDetails,
      };

      console.log("analyticsDetails", analyticsDetails);
      return res.json({ status: 200, msg: "View details", data: analyticsDetails });

  } catch (error) {
      console.error('Error fetching analytics data:', error);
      return res.status(500).json({ message: 'An error occurred while retrieving analytics data' });
  }
});

module.exports = router;
