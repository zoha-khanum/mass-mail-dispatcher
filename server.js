require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

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
        }
    })
);

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Mass Mail Dispatcher backend is running.");
});


// Get Gmail access token using refresh token
async function getAccessToken() {

    const response = await fetch(
        "https://oauth2.googleapis.com/token",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                client_id: process.env.GMAIL_CLIENT_ID,
                client_secret: process.env.GMAIL_CLIENT_SECRET,
                refresh_token: process.env.GMAIL_REFRESH_TOKEN,
                grant_type: "refresh_token"
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error("Token error:", data);
        throw new Error("Could not get Gmail access token.");
    }

    return data.access_token;
}


// Send mail
app.post("/send-email", async (req, res) => {

    const { emails, subject, message } = req.body;

    if (
        !Array.isArray(emails) ||
        emails.length === 0 ||
        !subject ||
        !message
    ) {
        return res.status(400).json({
            message: "Please provide emails, subject and message."
        });
    }

    try {

        const accessToken = await getAccessToken();

        const emailContent = [
            `From: Mass Mail Dispatcher <${process.env.EMAIL_USER}>`,
            `To: ${process.env.EMAIL_USER}`,
            `Bcc: ${emails.join(", ")}`,
            `Subject: ${subject}`,
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=UTF-8",
            "",
            message
        ].join("\r\n");


        const encodedMessage = Buffer
            .from(emailContent)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");


        const gmailResponse = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    raw: encodedMessage
                })
            }
        );

        const data = await gmailResponse.json();

        if (!gmailResponse.ok) {

            console.error("Gmail API error:", data);

            return res.status(gmailResponse.status).json({
                message:
                    data?.error?.message ||
                    "Unable to send emails."
            });
        }

        console.log("Gmail API message sent:", data.id);

        return res.status(200).json({
            message: "Emails sent successfully!"
        });

    } catch (error) {

        console.error("Server error:", error);

        return res.status(500).json({
            message: "Error sending emails."
        });
    }

});


const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});