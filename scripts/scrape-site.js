// Scrapes lovelicare.com with Firecrawl and saves it as markdown for the chatbot.
// Run manually after the live site changes: npm run scrape
// Output: site-content.md (loaded by server.js at startup, after the curated knowledge base)

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Firecrawl } = require("firecrawl");

const SITE_URL = "https://lovelicare.com/";
const OUTPUT_FILE = path.join(__dirname, "..", "site-content.md");

async function main() {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY is missing. Add it to your .env file.");
    process.exit(1);
  }

  const client = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

  console.log(`Scraping ${SITE_URL} ...`);
  const doc = await client.scrape(SITE_URL, {
    formats: ["markdown"],
    onlyMainContent: true,
    // GoDaddy's header/account menu survives onlyMainContent, so drop it explicitly
    excludeTags: ["header", "nav", "footer"]
  });

  if (!doc.markdown || doc.markdown.trim().length === 0) {
    throw new Error("Scrape returned no markdown content.");
  }

  // Images are useless to the chatbot and cost tokens on every request
  const markdown = doc.markdown
    .replace(/!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g, "") // URLs may contain "(40)" etc.
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const header = `<!-- Scraped from ${SITE_URL} on ${new Date().toISOString()} -->\n\n`;
  fs.writeFileSync(OUTPUT_FILE, header + markdown + "\n");

  console.log(`Saved ${markdown.length} characters to site-content.md`);
  if (doc.metadata?.title) console.log(`Page title: ${doc.metadata.title}`);
}

main().catch(err => {
  console.error("Scrape failed:", err.message);
  process.exit(1);
});
