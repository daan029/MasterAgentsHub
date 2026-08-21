// One-off local helper: run this ONCE by hand to mint the initial TikTok
// refresh token for @klipje0. Never run by CI, never commit real values.
//
// Usage:
//   TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... node scripts/tiktok-init-auth.js
//
// TikTok's Web-platform redirect URI must be on a verified domain, not
// localhost, so this doesn't run its own listener — it points TikTok at
// the static oauth-callback.html page on the live GitHub Pages site,
// which just displays the returned code for you to copy. Paste it back
// here, and this script exchanges it for tokens and prints them.

const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const crypto = require("node:crypto");

const REDIRECT_URI = "https://daan029.github.io/MasterAgentsHub/oauth-callback.html";
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

if (!CLIENT_KEY || !CLIENT_SECRET) {
  console.error("Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET env vars first.");
  process.exit(1);
}

async function main() {
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
  console.log("You'll land on the oauth-callback.html page showing an authorization code.");
  console.log("Expected state value: " + state + " (the page shows this too — check it matches).\n");

  const rl = readline.createInterface({ input, output });
  const code = (await rl.question("Paste the authorization code here: ")).trim();
  rl.close();

  if (!code) {
    console.error("No code entered.");
    process.exit(1);
  }

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

  console.log("\nSuccess! Add this as a GitHub repo secret:\n");
  console.log("TIKTOK_REFRESH_TOKEN =", data.refresh_token);
  console.log("\n(access_token is short-lived and not needed as a secret — only the refresh token is stored.)");
}

main();
