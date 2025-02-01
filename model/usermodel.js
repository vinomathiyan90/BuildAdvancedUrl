const mongoose = require('mongoose')
const dotenv = require("dotenv")
dotenv.config()

const userData = new mongoose.Schema({
    name: {
        type: String,
    },
    userId: {
        type: String,
        required: [true, "ID is required"]
    },
    email: {
        type: String,
        required: [true, "Email is required"]
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
})
const userdata = mongoose.model("UserData", userData);
module.exports = userdata;
