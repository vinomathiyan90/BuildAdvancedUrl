require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path")
const userData = require("./router/userdata")
const urlData = require("./router/urldata")
const databaseconnect  = require('./config/database') 
const jwtMiddleware = require("./middleware/jwtverify")
const app = express();
const PORT = process.env.PORT

app.set('trust proxy', 1);

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.get("/api/auth/google", (req, res) => {
    res.sendFile(path.join(__dirname, "profile.html"));
})

app.get('/script.js', (req, res) => {
    res.type('application/javascript'); 
    res.sendFile(path.join(__dirname, 'script.js'));
});


// userRouter
app.post("/api/verifyaccessToken",userData)
app.get("/api/protected-route",jwtMiddleware.verifyJwtMiddleware,userData)
app.get("/api/auth/google",userData)

//urlRouter
app.post("/api/short",urlData);
app.get("/api/shorten/:urlId",urlData)
app.get("/api/analytics/:urlId",urlData)
app.get("/api/analytics/topic/:topic",urlData)
app.get("/analytics/overall",urlData)




// database connection
databaseconnect();


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on this http://localhost:${PORT}`);
});
