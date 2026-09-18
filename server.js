require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();


// -------------------- CORS --------------------

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


// -------------------- HOME ROUTE --------------------

app.get("/", (req, res) => {
    res.status(200).send("Mass Mail Dispatcher backend is running.");
});


// -------------------- SEND EMAIL --------------------

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

    if (!process.env.BREVO_API_KEY) {
        console.error("BREVO_API_KEY is missing.");

        return res.status(500).json({
            message: "Brevo API key is not configured."
        });
    }

    if (!process.env.EMAIL_USER) {
        console.error("EMAIL_USER is missing.");

        return res.status(500).json({
            message: "Sender email is not configured."
        });
    }

    try {

        const response = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",

                headers: {
                    "accept": "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    sender: {
                        name: "Mass Mail Dispatcher",
                        email: process.env.EMAIL_USER
                    },

                    to: [
                        {
                            email: process.env.EMAIL_USER
                        }
                    ],

                    bcc: emails.map((email) => ({
                        email: email
                    })),

                    subject: subject,

                    textContent: message
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            console.error("Brevo API error:", data);

            return res.status(response.status).json({
                message: data.message || "Unable to send emails."
            });
        }

        console.log("Brevo email sent:", data);

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


// -------------------- START SERVER --------------------

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});