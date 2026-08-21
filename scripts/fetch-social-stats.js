// Refreshes TikTok + Instagram OAuth tokens, fetches @klipje0's follower
// stats, writes social-stats.json, and rotates any changed OAuth tokens
// back into GitHub Actions secrets via the `gh` CLI (only if GH_TOKEN is
// set — safe to run locally without it for a dry run).
//
// Run by .github/workflows/social-stats.yml. Requires Node 18+ (built-in
// fetch) and, in CI, the `gh` CLI (preinstalled on GitHub-hosted runners).

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const OUT_PATH = path.join(__dirname, "..", "social-stats.json");
const GH_REPO = process.env.GH_REPO || "daan029/MasterAgentsHub";

function readExistingStats() {
  try {
    return JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeStatsJson(data) {
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n");
}

function rotateSecretIfChanged(name, oldValue, newValue) {
  if (!newValue || newValue === oldValue) return;
  if (!process.env.GH_TOKEN) {
    console.log(`[dry run] would rotate secret ${name} (new value length ${newValue.length})`);
    return;
  }
  execFileSync("gh", ["secret", "set", name, "--body", newValue, "--repo", GH_REPO], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log(`rotated secret ${name}`);
}

// --- TikTok --------------------------------------------------------------

async function tiktokRefreshToken(clientKey, clientSecret, refreshToken) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`tiktok token refresh failed: ${data.error_description || res.status}`);
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function tiktokFetchStats(accessToken) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") throw new Error(`tiktok user/info failed: ${data.error?.message || res.status}`);
  const u = data.data.user;
  return { followers: u.follower_count, likes: u.likes_count, videos: u.video_count };
}

async function fetchTikTok(existing) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const refreshToken = process.env.TIKTOK_REFRESH_TOKEN;
  if (!clientKey || !clientSecret || !refreshToken) throw new Error("missing TikTok env vars");

  const { accessToken, refreshToken: newRefreshToken } = await tiktokRefreshToken(clientKey, clientSecret, refreshToken);
  // TikTok rotates the refresh token on every use, so persist unconditionally.
  rotateSecretIfChanged("TIKTOK_REFRESH_TOKEN", refreshToken, newRefreshToken);

  const stats = await tiktokFetchStats(accessToken);
  const now = new Date().toISOString();
  return { status: "ok", ...stats, updatedAt: now, lastAttemptAt: now, error: null };
}

// --- Instagram / Meta ------------------------------------------------------

async function metaRefreshLongLivedToken(appId, appSecret, currentToken) {
  const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", currentToken);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`meta token refresh failed: ${data.error?.message || res.status}`);
  return { accessToken: data.access_token };
}

async function metaFetchPageToken(pageId, userToken) {
  const url = new URL("https://graph.facebook.com/v19.0/me/accounts");
  url.searchParams.set("access_token", userToken);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`meta /me/accounts failed: ${data.error?.message || res.status}`);
  const page = (data.data || []).find((p) => p.id === pageId);
  if (!page) throw new Error(`meta: page ${pageId} not found in /me/accounts`);
  return page.access_token;
}

async function metaFetchIgStats(igUserId, token) {
  const url = new URL(`https://graph.facebook.com/v19.0/${igUserId}`);
  url.searchParams.set("fields", "followers_count,media_count");
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(`meta ig stats failed: ${data.error?.message || res.status}`);
  return { followers: data.followers_count, posts: data.media_count };
}

async function fetchInstagram(existing) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const userToken = process.env.META_LONG_LIVED_USER_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igUserId = process.env.META_IG_USER_ID;
  if (!appId || !appSecret || !userToken || !pageId || !igUserId) throw new Error("missing Meta env vars");

  const { accessToken: refreshedUserToken } = await metaRefreshLongLivedToken(appId, appSecret, userToken);
  rotateSecretIfChanged("META_LONG_LIVED_USER_TOKEN", userToken, refreshedUserToken);

  const pageToken = await metaFetchPageToken(pageId, refreshedUserToken);
  const stats = await metaFetchIgStats(igUserId, pageToken);
  const now = new Date().toISOString();
  return { status: "ok", ...stats, updatedAt: now, lastAttemptAt: now, error: null };
}

// --- orchestration -----------------------------------------------------

function preserveOnFailure(existing, platform, err) {
  const prev = existing[platform] || {};
  return { ...prev, status: "error", lastAttemptAt: new Date().toISOString(), error: String(err.message || err) };
}

async function main() {
  const existing = readExistingStats();

  const [tiktokResult, instagramResult] = await Promise.allSettled([
    fetchTikTok(existing),
    fetchInstagram(existing),
  ]);

  const tiktok =
    tiktokResult.status === "fulfilled" ? tiktokResult.value : preserveOnFailure(existing, "tiktok", tiktokResult.reason);
  const instagram =
    instagramResult.status === "fulfilled"
      ? instagramResult.value
      : preserveOnFailure(existing, "instagram", instagramResult.reason);

  if (tiktokResult.status === "rejected") console.error("tiktok fetch failed:", tiktokResult.reason.message);
  if (instagramResult.status === "rejected") console.error("instagram fetch failed:", instagramResult.reason.message);

  writeStatsJson({ generatedAt: new Date().toISOString(), tiktok, instagram });
}

main().catch((err) => {
  console.error("fatal:", err.message || err);
  process.exit(1);
});
