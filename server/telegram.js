const https = require("https");

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHANNEL_ID = process.env.TG_CHANNEL_ID;
const SITE_URL = "https://ndlist.space";

function tgRequest(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) resolve(parsed.result);
          else reject(new Error(parsed.description || "Telegram API error"));
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function segmentLabel(segment) {
  const map = { main: "Main List", extended: "Extended List", legacy: "Legacy" };
  return map[String(segment || "").toLowerCase()] || String(segment || "—");
}

function thumbUrl(level) {
  if (!level.thumbnailUrl) return null;
  if (level.thumbnailUrl.startsWith("http")) return level.thumbnailUrl;
  return `${SITE_URL}${level.thumbnailUrl}`;
}

async function notifyLevelAdded(level, neighbors = null) {
  const neighborLine = neighbors
    ? [
        neighbors.aboveName ? `above: <b>${neighbors.aboveName}</b>` : null,
        neighbors.belowName ? `below: <b>${neighbors.belowName}</b>` : null,
      ].filter(Boolean).join(" · ")
    : null;

  const lines = [
    `🟢 <b>New Level — NDL</b>`,
    ``,
    `<b>${level.name}</b>  placed at <b>#${level.rank}</b>`,
    level.originalName ? `original: <i>${level.originalName}</i>` : null,
    `creator: <b>${level.creator}</b>  ·  verifier: <b>${level.verifier}</b>`,
    `segment: <b>${segmentLabel(level.segment)}</b>  ·  score: <b>${level.score100} pts</b>`,
    level.minProgress != null ? `min: <b>${level.minProgress}%</b> → <b>${level.minProgressScore} pts</b>` : null,
    neighborLine || null,
    ``,
    `<a href="${SITE_URL}/level?id=${level.id}">View on NDL</a>`,
  ].filter((x) => x !== null).join("\n");

  const photo = thumbUrl(level);
  try {
    if (photo) {
      await tgRequest("sendPhoto", {
        chat_id: CHANNEL_ID,
        photo,
        caption: lines,
        parse_mode: "HTML",
      });
    } else {
      await tgRequest("sendMessage", {
        chat_id: CHANNEL_ID,
        text: lines,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      });
    }
  } catch (err) {
    console.error("[TG] notifyLevelAdded:", err.message);
  }
}

async function notifyLevelMoved(level, previousRank, allLevels) {
  const up = level.rank < previousRank;
  const arrow = up ? "⬆️" : "⬇️";

  const sorted = [...(allLevels || [])].sort((a, b) => a.rank - b.rank);
  const above = sorted.find((l) => l.rank === level.rank - 1 && l.id !== level.id);
  const below = sorted.find((l) => l.rank === level.rank + 1 && l.id !== level.id);

  const neighborLine = [
    above ? `above it: <b>${above.name}</b>` : null,
    below ? `below it: <b>${below.name}</b>` : null,
  ].filter(Boolean).join(" · ");

  const lines = [
    `${arrow} <b>${up ? "Moved Up" : "Moved Down"} — NDL</b>`,
    ``,
    `<b>${level.name}</b>  <b>#${previousRank}</b> → <b>#${level.rank}</b>`,
    neighborLine || null,
    ``,
    `<a href="${SITE_URL}/level?id=${level.id}">View on NDL</a>`,
  ].filter((x) => x !== null).join("\n");
  const text = lines;

  try {
    await tgRequest("sendMessage", {
      chat_id: CHANNEL_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("[TG] notifyLevelMoved:", err.message);
  }
}

async function notifyLevelRemoved(level) {
  const text = [
    `🗑 <b>Level Removed from NDL</b>`,
    ``,
    `🎮 <b>${level.name}</b>`,
    level.originalName ? `🎮 Original: <i>${level.originalName}</i>` : null,
    `📋 Was at: <b>#${level.rank}</b> · <b>${segmentLabel(level.segment)}</b>`,
  ].filter((x) => x !== null).join("\n");

  try {
    await tgRequest("sendMessage", {
      chat_id: CHANNEL_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("[TG] notifyLevelRemoved:", err.message);
  }
}

module.exports = { notifyLevelAdded, notifyLevelMoved, notifyLevelRemoved };
