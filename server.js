require("dotenv").config();
const express = require("express");
const path = require("path");
const { google } = require("googleapis");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const KNOWLEDGE_BASE = require("./knowledge-base");
const { getSupabase, isConfigured: supabaseConfigured, keyMode } = require("./lib/supabase");
const dashboardApi = require("./lib/dashboard-api");

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

// ── Owner dashboard ─────────────────────────────────────────────────────────
// Internal surface. The API refuses to serve unless DASHBOARD_TOKEN is set,
// so an unconfigured deploy exposes nothing. See lib/dashboard-api.js.
app.use("/api/dashboard", dashboardApi);

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/health", (req, res) => {
  res.json({
    status: "Love Li Care server running ✅",
    chatbot: process.env.ANTHROPIC_API_KEY ? "configured" : "disabled (ANTHROPIC_API_KEY not set)",
    supabase: supabaseConfigured() ? `configured (${keyMode()} key)` : "missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY",
    emailNotifications: gmailConfigured ? "configured" : "disabled (GOOGLE_* not set)",
    dashboard: !process.env.DASHBOARD_TOKEN
      ? "disabled (DASHBOARD_TOKEN not set)"
      : keyMode() === "service_role"
        ? "configured"
        : "token set, but reads need SUPABASE_SERVICE_ROLE_KEY"
  });
});

app.get(["/chatbot", "/wellness-chatbox"], (req, res) => {
  res.redirect("/chatbot.html");
});

// ── Form intake helpers ─────────────────────────────────────────────────────

const NOTIFY_TO = process.env.NOTIFY_EMAIL || "LoveLiCareSvcs@gmail.com";

const gmailConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REFRESH_TOKEN
);

/** Trim a submitted value and cap its length. Returns null for empty input. */
function field(value, max) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Escape user input before it goes into notification HTML. */
function escapeHtml(value) {
  return String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function createGmailDraft({ to, subject, body }) {
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
    requestBody: { message: { raw: encodedMessage } }
  });

  return draft.data.id;
}

/**
 * Best-effort email notification. Supabase is the system of record, so a Gmail
 * failure (or missing GOOGLE_* credentials) must never fail the submission.
 */
async function notifyByEmail({ subject, body }) {
  if (!gmailConfigured) return;
  try {
    await createGmailDraft({ to: NOTIFY_TO, subject, body });
  } catch (err) {
    console.error("Notification draft failed (submission was still saved):", err.message);
  }
}

// ── Contact form → contact_inquiries ────────────────────────────────────────

app.post("/api/contact", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Contact submission rejected: Supabase is not configured.");
    return res.status(503).json({ error: "Form is temporarily unavailable." });
  }

  const email = field(req.body?.email, 320);
  if (!validEmail(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const inquiry = {
    name:       field(req.body?.name, 200),
    email:      email.toLowerCase(),
    phone:      field(req.body?.phone, 50),
    service:    field(req.body?.service, 120),
    message:    field(req.body?.message, 5000),
    source:     "website_contact_form",
    page_url:   field(req.body?.pageUrl, 500),
    user_agent: field(req.get("user-agent"), 500)
  };

  // No .select() after the insert: the tables are insert-only under RLS, so
  // asking for the row back would be denied and fail an otherwise good write.
  // The visitor does not need the id — only confirmation that it was saved.
  const { error } = await supabase.from("contact_inquiries").insert(inquiry);

  if (error) {
    console.error("Contact insert failed:", error.message);
    return res.status(500).json({ error: "Could not save your message. Please try again." });
  }

  await notifyByEmail({
    subject: `New Inquiry from ${inquiry.name || inquiry.email} — ${inquiry.service || "General"}`,
    body: `
      <p><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(inquiry.phone)}</p>
      <p><strong>Service:</strong> ${escapeHtml(inquiry.service)}</p>
      <p><strong>Message:</strong><br>${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}</p>
    `
  });

  res.status(201).json({ success: true });
});

// ── Subscribe form → newsletter_subscribers ─────────────────────────────────

app.post("/api/subscribe", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    console.error("Subscribe rejected: Supabase is not configured.");
    return res.status(503).json({ error: "Signup is temporarily unavailable." });
  }

  const email = field(req.body?.email, 320);
  if (!validEmail(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const subscriber = {
    email:      email.toLowerCase(),
    source:     "website_subscribe_form",
    page_url:   field(req.body?.pageUrl, 500),
    user_agent: field(req.get("user-agent"), 500)
  };

  const { error } = await supabase.from("newsletter_subscribers").insert(subscriber);

  // 23505 = unique violation. Already subscribed is a success from the visitor's side.
  if (error && error.code !== "23505") {
    console.error("Subscribe insert failed:", error.message);
    return res.status(500).json({ error: "Could not complete your signup. Please try again." });
  }

  const alreadySubscribed = Boolean(error);
  if (!alreadySubscribed) {
    await notifyByEmail({
      subject: "New Wellness Community Subscriber",
      body: `<p>New subscriber: <strong>${escapeHtml(subscriber.email)}</strong></p>
             <p>Source: Online Store subscribe form</p>`
    });
  }

  res.status(201).json({ success: true, alreadySubscribed });
});

// ── Legacy Gmail draft endpoint (superseded by /api/contact) ────────────────

app.post("/draft", async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const id = await createGmailDraft({ to, subject, body });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (message.length > 5000 || !Array.isArray(history) || history.some(h =>
      !h || !["user", "assistant"].includes(h.role) ||
      typeof h.content !== "string" || !h.content.trim() || h.content.length > 10000
    )) {
      return res.status(400).json({ error: "Please send a shorter message with valid conversation history." });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "Our wellness assistant is temporarily unavailable. Please call 410-616-5451 or email LoveLiCareSvcs@gmail.com for help." });
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
    res.status(503).json({ error: "Our wellness assistant is temporarily unavailable. Please try again later, call 410-616-5451, or email LoveLiCareSvcs@gmail.com for help." });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Chatbot: http://localhost:${PORT}/chatbot`);
  });
}

module.exports = app;
