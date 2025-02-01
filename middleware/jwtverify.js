const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY;
exports.verifyJwtMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    console.log('Received Headers:', req.headers);
    console.log(token) //  // Extract JWT token
    if (!token) {
      return res.status(403).json({ message: 'Token is required' });
    }
    console.log("2. Extracted Token:", token);
  
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log("Token verification failed:", err.message);
        return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
      }
      req.userId = decoded.userId; // Extract userId from token payload
      console.log("3. Token verified. UserId:", req.userId);
  
      next(); // Proceed to next middleware or route handler
    });
  };
  
