require("dotenv").config();
const express = require("express");
const path = require("path");
const { google } = require("googleapis");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const KNOWLEDGE_BASE = require("./knowledge-base");

// Optional supplement: live site content scraped via `npm run scrape`
const SITE_CONTENT_FILE = path.join(__dirname, "site-content.md");
const SITE_CONTENT = fs.existsSync(SITE_CONTENT_FILE)
  ? fs.readFileSync(SITE_CONTENT_FILE, "utf8")
  : "";

const app = express();
app.use(express.json());
// Local dev only — on Vercel, public/ is served by the CDN and express.static is ignored
app.use(express.static(path.join(__dirname, "public")));

// ── Google OAuth (Gmail Draft Engine) ──────────────────────────────────────
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// ── Anthropic client ────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the LoveLi Care wellness assistant — warm, knowledgeable, and professional. You help visitors learn about LoveLi Care Med Spa & Wellness Lounge and find the right services for their goals.

STRICT RULE: Answer questions ONLY using the information in the knowledge base below. Do not invent services, prices, or details not listed. If a question falls outside the knowledge base, respond with: "I don't have that information — please reach out to our team directly at 410-616-5451, text 443-678-2254, or email LoveLiCareSvcs@gmail.com."

Keep responses concise, warm, and on-brand. Use the business's first-person voice ("we", "our team", "at LoveLi Care"). When appropriate, invite the visitor to book a complimentary consultation.

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}${SITE_CONTENT ? `

WEBSITE CONTENT (scraped from lovelicare.com — supplementary; if it conflicts with the knowledge base above, the knowledge base wins):
${SITE_CONTENT}` : ""}`;

// ── Routes ──────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "Love Li Care Draft Engine running ✅" });
});

app.get("/chatbot", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chatbot.html"));
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

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Chatbot is not configured. Please add ANTHROPIC_API_KEY to your .env file." });
    }

    // Build conversation history (last 10 turns max to stay within token limits)
    const recentHistory = history.slice(-10);
    const messages = [
      ...recentHistory.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message.trim() }
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Chatbot: http://localhost:${PORT}/chatbot`);
});
