import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import * as cheerio from "cheerio";

const app = express();
const port = 8000;
const testOsuId = 19637339;

const SUPABASE_URL = "https://yqgqoxgykswytoswqpkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZ3FveGd5a3N3eXRvc3dxcGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTkxNTEsImV4cCI6MjA2NDI5NTE1MX0.cIWfvz9dlSWwYy7QKSmWpEHc1KVzpB77VzB7TNhQ2ec";

async function callRpc(name, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error(`Supabase RPC failed: ${res.statusText}`);
  return res.json();
}

function adjustFontSize(username, maxChars = 14, baseSize = 1.41111) {
  if (username.length > maxChars) {
    return (baseSize * maxChars) / username.length;
  }
  return baseSize;
}

function formatPct(value) {
  return typeof value === "number" ? value.toFixed(2) + "%" : "-";
}

function generateSvg(profile, stats, streaks, leaderboard, internalId) {
  let svg = fs.readFileSync("main.svg", "utf8");
  const $ = cheerio.load(svg, { xmlMode: true });

  const tspan = $("#username tspan");
  const username = profile.username ?? "name";
  const fontSize = adjustFontSize(username);
  tspan.text(username);
  tspan.attr("style", tspan.attr("style").replace(/font-size:[^;]+/, `font-size:${fontSize}px`));

  $("#pfp").attr("xlink:href", profile.avatar_url ?? "https://paraliyzed.net/img/lara.png");

  const me = leaderboard?.find((r) => r.is_target_user) || {};

  $("#total_score tspan").text(stats.totalScorePoints ?? "-");
  $("#avg_acc tspan").text(formatPct(me.average_accuracy));
  $("#rank tspan").text(me.position ?? "-");
  $("#plays tspan").text(stats.totalScores ?? "-");
  $("#top1 tspan").text(stats.firstPlaceCount ?? "-");
  $("#top tspan").text(formatPct(100 - (me.percentile ?? 0)));
  $("#current_streak tspan").text(streaks.currentStreak ?? "-");
  $("#best_streak tspan").text(streaks.longestStreak ?? "-");

  return $.xml();
}

app.get("/api/card", async (req, res) => {
  try {
    const osuId = req.query.id;
    if (!osuId) return res.status(400).send("Missing osuId");

    // get internalId
    const rawInt = await callRpc("get_user_id_from_osu_id", { p_osu_id: osuId });
    const internalId =
      typeof rawInt === "number"
        ? rawInt
        : Array.isArray(rawInt)
        ? rawInt.find((v) => typeof v === "number")
        : rawInt && typeof rawInt === "object"
        ? Object.values(rawInt).find((v) => typeof v === "number")
        : null;

    if (!internalId) {
      return res.status(404).send("User not found");
    }

    // fetch profile
    const apiUrl = `https://www.challengersnexus.com/api/user/profile/${internalId}`;
    const profileRes = await fetch(apiUrl);
    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const profileData = await profileRes.json();
    const profile = profileData?.data?.user || {};
    const stats = profileData?.data?.stats || {};
    const streaks = profileData?.data?.streaks || {};

    // season / leaderboard
    const SEASON_ID = await callRpc("get_current_season_id", {});
    const leaderboard = await callRpc("get_season_leaderboard_with_user", {
      user_id_param: internalId,
      season_id_param: SEASON_ID,
    });

    const svg = generateSvg(profile, stats, streaks, leaderboard, internalId);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store");
    res.send(svg);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error: " + err.message);
  }
});

app.listen(port, () => {
  console.log(`SVG API running at http://localhost:${port}/api/card?id=${testOsuId}`);
});
