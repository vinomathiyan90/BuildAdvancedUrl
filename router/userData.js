const express = require("express");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
dotenv.config();
const router = express.Router();
// usermodel
const Userdata = require('../model/usermodel');

// verifying google access token 
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLINET_SECRET;
const REDIRECT_URI = 'http://localhost:3500/api/auth/google';
const SECRET_KEY = process.env.SECRET_KEY;

// getAccessToken
async function getAccessToken(code) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URI}&grant_type=authorization_code`,
    });
    const data = await response.json();
    const accessToken = data.accessToken
    localStorage.setItem("token", accessToken)
    return data.access_token;
}

// Verify the access token with Google OAuth2 endpoint
async function verifyAccessToken(token) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    if (!response.ok) {
        throw new Error('Invalid token');
    }
    const data = await response.json();
    console.log("userprofile for backend", data)
    const userEmail = data.email
    const userId = data.id
    const name = data.name

    // console.log(userEmail, CilentId)
    const User = new Userdata({
        name: name,
        userId: userId,
        email: userEmail,


    })
    // 1.store database in email id and userid- bcrypt format
    Userdata.findOne({ email: data.email })
        .then(data => {
            console.log(data)
            if (!data) {
                console.log("HIII")
                User.save()
                    .then(saveUser => {
                        const userId = saveUser.userId
                        console.log(userId)
                        console.log("saved", saveUser)

                    }).catch(err => {
                        console.log("error will saving")
                    })
            }


        }).catch(err => {
            console.log("error while finidng", err)
        })



    return data;
}


// Generate JWT for your application
function generateJWT(user) {
    return jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, {
        expiresIn: '1h',
    });
}

// OAuth callback endpoint
router.get('/api/auth/google', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }
    try {
        const accessToken = await getAccessToken(code);
        const user = await verifyAccessToken(accessToken);
        console.log(user)
        const jwtToken = generateJWT(user);
        // Send JWT to frontend
        res.redirect(`http://localhost:3500?jwt=${jwtToken}`);
    } catch (error) {
        console.error('Error during authentication:', error);
        res.status(400).json({ error: 'Authentication failed' });
    }
});

router.post('/api/verifyaccessToken', async (req, res) => {
    const { token } = req.body;
    // console.log(token)
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    try {
        const payload = await verifyAccessToken(token);
        const jwtToken = generateJWT(payload);
        res.json({ msg: "jwt sucessfully created", jwt: jwtToken });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(400).json({ error: 'Invalid token' });
    }
});



module.exports = router;