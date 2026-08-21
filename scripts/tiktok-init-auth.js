// One-off local helper: run this ONCE by hand to mint the initial TikTok
// refresh token for @klipje0. Never run by CI, never commit real values.
//
// Usage:
//   TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... node scripts/tiktok-init-auth.js
//
// Opens the TikTok authorize URL, listens on localhost for the redirect,
// exchanges the code for tokens, and prints access_token/refresh_token to
// the console. Copy refresh_token into the TIKTOK_REFRESH_TOKEN GitHub
// secret (along with TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET).

const http = require("node:http");
const crypto = require("node:crypto");

const PORT = 8787;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

if (!CLIENT_KEY || !CLIENT_SECRET) {
  console.error("Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET env vars first.");
  process.exit(1);
}

const state = crypto.randomBytes(8).toString("hex");
const authorizeUrl =
  "https://www.tiktok.com/v2/auth/authorize/?" +
  new URLSearchParams({
    client_key: CLIENT_KEY,
    scope: "user.info.basic,user.info.stats",
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state,
  });

console.log("\nOpen this URL, log in as @klipje0, and approve:\n");
console.log(authorizeUrl + "\n");
console.log(`Waiting for redirect on ${REDIRECT_URI} ...`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code || returnedState !== state) {
    res.writeHead(400).end("Missing code or state mismatch.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" }).end("Got it — you can close this tab.");
  server.close();

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });
  const data = await tokenRes.json();
  if (!tokenRes.ok || data.error) {
    console.error("Token exchange failed:", data);
    process.exit(1);
  }

  console.log("\nSuccess! Add these as GitHub repo secrets:\n");
  console.log("TIKTOK_REFRESH_TOKEN =", data.refresh_token);
  console.log("\n(access_token is short-lived and not needed as a secret — only the refresh token is stored.)");
});

server.listen(PORT);
