import fs from "fs";
import * as cheerio from "cheerio";
import TextToSVG from "text-to-svg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://yqgqoxgykswytoswqpkj.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const fontRegular = TextToSVG.loadSync(path.join(__dirname, "../Inter.ttf"));
let fontBold = fontRegular;
try {
  fontBold = TextToSVG.loadSync("Inter.ttf");
} catch (_) {}

function pickFont(style) {
  const weight = (style["font-weight"] || "").toLowerCase();
  const spec = (style["-inkscape-font-specification"] || "").toLowerCase();
  if (weight.includes("bold") || weight === "700" || spec.includes("bold")) {
    return fontBold || fontRegular;
  }
  return fontRegular;
}

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

function adjustFontSizePx(text, maxChars, basePx) {
  if (!text) return basePx;
  return text.length > maxChars ? (basePx * maxChars) / text.length : basePx;
}

const pct = (v) => (typeof v === "number" ? v.toFixed(2) + "%" : "-");

function parseStyle(styleAttr = "") {
  const out = {};
  (styleAttr || "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((decl) => {
      const idx = decl.indexOf(":");
      if (idx > -1) {
        const k = decl.slice(0, idx).trim();
        const v = decl.slice(idx + 1).trim();
        out[k] = v;
      }
    });
  return out;
}

function mergedStyle(textStyle, tspanStyle) {
  return { ...textStyle, ...tspanStyle };
}

function coordsFor($node, $parent) {
  const x = parseFloat($node.attr("x") ?? $parent.attr("x") ?? "0");
  const y = parseFloat($node.attr("y") ?? $parent.attr("y") ?? "0");
  return { x, y };
}

function xWithAnchor(x, anchor, width) {
  if (anchor === "middle") return x - width / 2;
  if (anchor === "end") return x - width;
  return x;
}

function convertAllTextToPaths($) {
  $("text").each((_, el) => {
    const $text = $(el);
    const textStyle = parseStyle($text.attr("style"));
    const textAnchor = ($text.attr("text-anchor") || textStyle["text-anchor"] || "start").trim();
    const $group = $("<g/>");
    if ($text.attr("id")) $group.attr("id", $text.attr("id"));
    if ($text.attr("transform")) $group.attr("transform", $text.attr("transform"));
    const tspans = $text.children("tspan");
    const targets = tspans.length ? tspans.toArray() : [el];
    targets.forEach((node) => {
      const $node = $(node);
      const nodeStyle = parseStyle($node.attr("style"));
      const st = mergedStyle(textStyle, nodeStyle);

      const textContent = (tspans.length ? $node.text() : $text.text()) ?? "";
      if (!textContent) return;
      const fontSize = parseFloat(st["font-size"] || "16");
      const font = pickFont(st);

      let { x, y } = coordsFor($node, $text);
      y += 1.2;

      const id = $text.attr("id") || "";
      switch (id) {
        case "username":
          x -= 5;
          y -= 0.2;
          break;
        case "current_streak":
        case "best_streak":
          x += 3.3;
          y += 3;
          break;
        case "text9":
        case "text74":
          x += 0.1;
          break;
        case "text9-9":
        case "text73":
          x += 0.7;
          break;
      }

      const metrics = font.getMetrics(textContent, { fontSize });
      const width = metrics.width || 0;
      const topY = y - (metrics.ascender || 0);
      const startX = xWithAnchor(x, textAnchor, width);

      const d = font.getD(textContent, { x: startX, y: topY, fontSize });
      const $path = $("<path/>").attr("d", d);

      if (st.fill) $path.attr("fill", st.fill);
      else $path.attr("fill", "black");
      if (st["fill-opacity"]) $path.attr("fill-opacity", st["fill-opacity"]);
      if (st.stroke) $path.attr("stroke", st.stroke);
      if (st["stroke-opacity"]) $path.attr("stroke-opacity", st["stroke-opacity"]);
      if (st["stroke-width"]) $path.attr("stroke-width", st["stroke-width"]);
      if (st["stroke-linecap"]) $path.attr("stroke-linecap", st["stroke-linecap"]);
      if (st["stroke-linejoin"]) $path.attr("stroke-linejoin", st["stroke-linejoin"]);
      if (st["paint-order"]) $path.attr("paint-order", st["paint-order"]);

      $group.append($path);
    });

    $text.replaceWith($group);
  });
}

function generateSvg(profile, stats, streaks, leaderboard) {
  const svg = fs.readFileSync(path.join(__dirname, "../main.svg"), "utf8");
  const $ = cheerio.load(svg, { xmlMode: true });
  const me = Array.isArray(leaderboard)
    ? leaderboard.find((r) => r && (r.is_target_user || r.is_target_user === true)) || {}
    : {};

  const $nameSpan = $("#username tspan");
  const username = profile?.username ?? "name";
  if ($nameSpan.length) {
    const basePx = parseFloat(parseStyle($nameSpan.attr("style"))["font-size"] || "16");
    const newPx = adjustFontSizePx(username, 14, basePx);
    $nameSpan.text(username);
    const ns = parseStyle($nameSpan.attr("style"));
    ns["font-size"] = `${newPx}px`;
    const styleStr = Object.entries(ns).map(([k, v]) => `${k}:${v}`).join(";");
    $nameSpan.attr("style", styleStr);
  }

  async function getOsuAvatar(osuUsername) {
    try {
      const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.OSU_CLIENT_ID,
          client_secret: process.env.OSU_CLIENT_SECRET,
          grant_type: "client_credentials",
          scope: "public",
        }),
      });
      if (!tokenRes.ok) throw new Error("Failed to get OAuth token");
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const userRes = await fetch(`https://osu.ppy.sh/api/v2/users/${osuUsername}/osu`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userRes.ok) throw new Error("Failed to fetch osu user");
      const userData = await userRes.json();
      return userData.avatar_url;
    } catch (err) {
      console.error("Failed to fetch osu avatar:", err);
      return profile?.avatar_url ?? "https://paraliyzed.net/img/lara.png";
    }
  }

  const osuAvatar = await getOsuAvatar(profile?.username);
  $("#pfp").attr("xlink:href", osuAvatar);

  const setText = (sel, val) => {
    const $t = $(`${sel} tspan`);
    if ($t.length) $t.text(val);
  };
  setText("#total_score", stats?.totalScorePoints ?? "-");
  setText("#avg_acc", pct(me.average_accuracy));
  setText("#rank", me.position ?? "-");
  setText("#plays", stats?.totalScores ?? "-");
  setText("#top1", stats?.firstPlaceCount ?? "-");
  setText("#top", pct(100 - (me.percentile ?? 0)));
  setText("#current_streak", streaks?.currentStreak ?? "-");
  setText("#best_streak", streaks?.longestStreak ?? "-");

  convertAllTextToPaths($);
  return $.xml();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  try {
    const osuId = req.query.id || String(testOsuId);

    const rawInt = await callRpc("get_user_id_from_osu_id", { p_osu_id: osuId });
    const internalId =
      typeof rawInt === "number"
        ? rawInt
        : Array.isArray(rawInt)
        ? rawInt.find((v) => typeof v === "number")
        : rawInt && typeof rawInt === "object"
        ? Object.values(rawInt).find((v) => typeof v === "number")
        : null;

    if (!internalId) return res.status(404).send("User not found");

    const profileRes = await fetch(`https://www.challengersnexus.com/api/user/profile/${internalId}`);
    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const profileData = await profileRes.json();
    const profile = profileData?.data?.user || {};
    const stats = profileData?.data?.stats || {};
    const streaks = profileData?.data?.streaks || {};

    const SEASON_ID = await callRpc("get_current_season_id", {});
    const leaderboard = await callRpc("get_season_leaderboard_with_user", {
      user_id_param: internalId,
      season_id_param: SEASON_ID,
    });

    const outSvg = generateSvg(profile, stats, streaks, leaderboard);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store");
    res.send(outSvg);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error: " + err.message);
  }
}