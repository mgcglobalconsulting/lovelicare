// Exercises /api/contact and /api/subscribe with Supabase mocked at the module
// boundary, so no real project is touched and no Gmail draft is created.
process.env.SUPABASE_URL = "https://mock.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
delete process.env.GOOGLE_REFRESH_TOKEN;

const path = require("path");
const PROJECT = "/Users/markcartwright/Desktop/lovelicare";

const captured = [];
let nextError = null;

// Mock @supabase/supabase-js before server.js pulls it in.
const mockId = require.resolve("@supabase/supabase-js", { paths: [PROJECT] });
require.cache[mockId] = {
  id: mockId,
  filename: mockId,
  loaded: true,
  exports: {
    createClient: () => ({
      from(table) {
        return {
          insert(row) {
            captured.push({ table, row });
            const result = nextError
              ? { data: null, error: nextError }
              : { data: { id: "mock-uuid-1" }, error: null };
            return {
              select: () => ({ single: async () => result }),
              then: (resolve) => resolve(result)
            };
          }
        };
      }
    })
  }
};

const app = require(path.join(PROJECT, "server.js"));
const server = app.listen(0, run);

async function post(route, body) {
  const res = await fetch(`http://127.0.0.1:${server.address().port}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "test-agent/1.0" },
    body: JSON.stringify(body)
  });
  return { status: res.status, json: await res.json() };
}

let failures = 0;
function check(label, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : "  → " + JSON.stringify(detail)}`);
  if (!cond) failures++;
}

async function run() {
  // 1. Health
  const health = await (await fetch(`http://127.0.0.1:${server.address().port}/health`)).json();
  check("health reports supabase configured + key mode", /^configured \(/.test(health.supabase), health);
  check("health reports email disabled", health.emailNotifications.startsWith("disabled"), health);

  // 2. Contact — happy path, every labeled field mapped
  captured.length = 0;
  let r = await post("/api/contact", {
    name: "  Jane Doe  ",
    email: "Jane.Doe@Example.com",
    phone: "(443) 000-0000",
    service: "Body Contouring / Snatch Protocol™",
    message: "Interested in a consult.\nSecond line.",
    pageUrl: "https://lovelicare.com/#contact"
  });
  check("contact returns 201", r.status === 201, r);
  check("contact reports success without leaking a row id", r.json.success === true && r.json.id === undefined, r.json);
  const row = captured[0]?.row || {};
  check("writes to contact_inquiries", captured[0]?.table === "contact_inquiries", captured[0]);
  check("name trimmed", row.name === "Jane Doe", row);
  check("email lowercased", row.email === "jane.doe@example.com", row);
  check("phone in own column", row.phone === "(443) 000-0000", row);
  check("service in own column", row.service === "Body Contouring / Snatch Protocol™", row);
  check("message preserves newline", row.message === "Interested in a consult.\nSecond line.", row);
  check("source labeled", row.source === "website_contact_form", row);
  check("page_url captured", row.page_url === "https://lovelicare.com/#contact", row);
  check("user_agent captured", row.user_agent === "test-agent/1.0", row);

  // 3. Contact — optional fields omitted become null, not ""
  captured.length = 0;
  r = await post("/api/contact", { email: "min@example.com", name: "", phone: "   " });
  check("minimal contact accepted", r.status === 201, r);
  check("blank name stored as null", captured[0].row.name === null, captured[0].row);
  check("whitespace phone stored as null", captured[0].row.phone === null, captured[0].row);

  // 4. Contact — validation
  captured.length = 0;
  r = await post("/api/contact", { name: "No Email" });
  check("missing email rejected 400", r.status === 400, r);
  r = await post("/api/contact", { email: "not-an-email" });
  check("malformed email rejected 400", r.status === 400, r);
  check("no rows written on validation failure", captured.length === 0, captured);

  // 5. Contact — db error surfaces as 500, not a false success
  nextError = { message: "boom", code: "XXXXX" };
  r = await post("/api/contact", { email: "err@example.com" });
  check("db error returns 500", r.status === 500, r);
  check("db error has no success flag", r.json.success === undefined, r.json);
  nextError = null;

  // 6. Subscribe — happy path
  captured.length = 0;
  r = await post("/api/subscribe", { email: "  New@Example.com ", pageUrl: "https://lovelicare.com/#shop" });
  check("subscribe returns 201", r.status === 201, r);
  check("writes to newsletter_subscribers", captured[0]?.table === "newsletter_subscribers", captured[0]);
  check("subscriber email normalized", captured[0].row.email === "new@example.com", captured[0].row);
  check("alreadySubscribed false for new", r.json.alreadySubscribed === false, r.json);

  // 7. Subscribe — duplicate is a success
  nextError = { message: "duplicate key", code: "23505" };
  r = await post("/api/subscribe", { email: "dupe@example.com" });
  check("duplicate subscribe returns 201", r.status === 201, r);
  check("duplicate flagged alreadySubscribed", r.json.alreadySubscribed === true, r.json);
  nextError = null;

  // 8. Subscribe — validation + other db errors
  r = await post("/api/subscribe", { email: "nope" });
  check("bad subscribe email rejected 400", r.status === 400, r);
  nextError = { message: "boom", code: "XXXXX" };
  r = await post("/api/subscribe", { email: "err@example.com" });
  check("non-duplicate db error returns 500", r.status === 500, r);
  nextError = null;

  // 9. Oversized input is capped, not rejected
  captured.length = 0;
  await post("/api/contact", { email: "big@example.com", message: "x".repeat(9000) });
  check("message capped at 5000", captured[0].row.message.length === 5000, captured[0].row.message.length);

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}
