require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();

const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://visionary-daifuku-78f150.netlify.app"
];

app.use(cors({
    origin: function (origin, callback) {

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }

    },

    methods: ["GET", "POST", "OPTIONS"],

    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());


const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }

});


app.post("/send-email", async (req, res) => {

    const { emails, subject, message } = req.body;

    if (!emails || emails.length === 0 || !subject || !message) {

        return res.status(400).json({
            message: "Please provide emails, subject and message."
        });

    }

    try {

        await transporter.sendMail({

            from: process.env.EMAIL_USER,

            to: process.env.EMAIL_USER,

            bcc: emails,

            subject: subject,

            text: message

        });

        res.json({
            message: "Emails sent successfully!"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Error sending emails",
            error: error.message
        });

    }

});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});