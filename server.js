require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

app.get("/health", (req, res) => {
  res.json({ status: "Love Li Care Draft Engine running ✅" });
});

app.post("/draft", async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    const message = [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      `Subject: ${subject}`,
      "",
      body
    ].join("\n");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const draft = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: { raw: encodedMessage }
      }
    });

    res.json({ success: true, id: draft.data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
