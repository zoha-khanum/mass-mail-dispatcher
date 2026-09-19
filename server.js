require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();


// ======================================================
// ENVIRONMENT VARIABLES
// trim() removes accidental spaces/new lines
// ======================================================

const GMAIL_CLIENT_ID = (process.env.GMAIL_CLIENT_ID || "").trim();
const GMAIL_CLIENT_SECRET = (process.env.GMAIL_CLIENT_SECRET || "").trim();
const GMAIL_REFRESH_TOKEN = (process.env.GMAIL_REFRESH_TOKEN || "").trim();
const EMAIL_USER = (process.env.EMAIL_USER || "").trim();


// ======================================================
// SAFE DEBUG CHECK
// This DOES NOT print your secret or refresh token
// ======================================================

console.log("GMAIL ENV CHECK:", {
    clientIdEnd: GMAIL_CLIENT_ID.slice(-30),
    clientIdLength: GMAIL_CLIENT_ID.length,
    clientSecretLength: GMAIL_CLIENT_SECRET.length,
    refreshTokenLength: GMAIL_REFRESH_TOKEN.length,
    emailConfigured: Boolean(EMAIL_USER)
});


// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "https://visionary-daifuku-78f150.netlify.app"
];

app.use(
    cors({
        origin: function (origin, callback) {

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }

        },

        methods: ["GET", "POST", "OPTIONS"],

        allowedHeaders: ["Content-Type"]
    })
);

app.use(express.json());


// ======================================================
// HOME ROUTE
// ======================================================

app.get("/", (req, res) => {

    res.status(200).send(
        "Mass Mail Dispatcher backend is running."
    );

});


// ======================================================
// GET GMAIL ACCESS TOKEN
// ======================================================

async function getAccessToken() {

    if (
        !GMAIL_CLIENT_ID ||
        !GMAIL_CLIENT_SECRET ||
        !GMAIL_REFRESH_TOKEN
    ) {

        throw new Error(
            "Gmail OAuth environment variables are missing."
        );

    }

    const response = await fetch(
        "https://oauth2.googleapis.com/token",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                client_id: GMAIL_CLIENT_ID,
                client_secret: GMAIL_CLIENT_SECRET,
                refresh_token: GMAIL_REFRESH_TOKEN,
                grant_type: "refresh_token"
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {

        console.error("Token error:", {
            error: data.error,
            error_description: data.error_description
        });

        throw new Error(
            "Could not get Gmail access token."
        );
    }

    return data.access_token;
}


// ======================================================
// SEND EMAIL
// ======================================================

app.post("/send-email", async (req, res) => {

    const { emails, subject, message } = req.body;

    if (
        !Array.isArray(emails) ||
        emails.length === 0
    ) {

        return res.status(400).json({
            message: "Please upload valid email addresses."
        });

    }

    if (!subject || !message) {

        return res.status(400).json({
            message: "Please enter subject and message."
        });

    }

    if (!EMAIL_USER) {

        return res.status(500).json({
            message: "Sender email is not configured."
        });

    }

    try {

        const accessToken = await getAccessToken();


        // ==================================================
        // CREATE EMAIL
        // ==================================================

        const emailContent = [

            `From: Mass Mail Dispatcher <${EMAIL_USER}>`,

            `To: ${EMAIL_USER}`,

            `Bcc: ${emails.join(", ")}`,

            `Subject: ${subject}`,

            "MIME-Version: 1.0",

            "Content-Type: text/plain; charset=UTF-8",

            "",

            message

        ].join("\r\n");


        // ==================================================
        // BASE64 URL ENCODE EMAIL
        // ==================================================

        const encodedMessage = Buffer
            .from(emailContent)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");


        // ==================================================
        // SEND USING GMAIL API
        // ==================================================

        const gmailResponse = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    raw: encodedMessage
                })
            }
        );

        const gmailData = await gmailResponse.json();


        if (!gmailResponse.ok) {

            console.error(
                "Gmail API error:",
                gmailData
            );

            return res
                .status(gmailResponse.status)
                .json({
                    message:
                        gmailData?.error?.message ||
                        "Unable to send emails."
                });

        }


        console.log(
            "Gmail message sent successfully:",
            gmailData.id
        );


        return res.status(200).json({
            message: "Emails sent successfully!"
        });


    } catch (error) {

        console.error(
            "Server error:",
            error.message
        );

        return res.status(500).json({
            message: "Error sending emails."
        });

    }

});


// ======================================================
// START SERVER
// ======================================================

const PORT = process.env.PORT || 10000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);