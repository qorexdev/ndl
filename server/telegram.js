const https = require("https");

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHANNEL_ID = process.env.TG_CHANNEL_ID;
const ADMIN_CHANNEL_ID = process.env.TG_ADMIN_CHANNEL_ID;
const WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET;
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

function profileLink(nickname) {
  if (!nickname) return null;
  return `<a href="${SITE_URL}/user?name=${encodeURIComponent(nickname)}">${nickname}</a>`;
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

  try {
    await tgRequest("sendMessage", {
      chat_id: CHANNEL_ID,
      text: lines,
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

async function notifySubmission(submission) {
  if (!BOT_TOKEN || !ADMIN_CHANNEL_ID) return;
  const id = submission.id;
  const isLevel = submission.type === "level";

  let text, keyboard;

  if (isLevel) {
    const creatorLink = profileLink(submission.creatorNickname);
    const verifierLink = profileLink(submission.verifierNickname);
    const playerLink = profileLink(submission.player);

    text = [
      `📋 <b>Новая заявка на уровень</b>`,
      ``,
      `<b>${submission.levelName || "—"}</b>`,
      submission.originalName ? `Оригинал: <i>${submission.originalName}</i>` : null,
      creatorLink ? `Создатель: ${creatorLink}` : null,
      verifierLink ? `Верификатор: ${verifierLink}` : null,
      submission.proposedRank ? `Предлагаемое место: <b>#${submission.proposedRank}</b>` : null,
      submission.originalPlacement ? `Позиция оригинала: <b>${submission.originalPlacement}</b>` : null,
      submission.segment ? `Список: <b>${segmentLabel(submission.segment)}</b>` : null,
      submission.length ? `Длина: <b>${submission.length}</b>` : null,
      submission.objects ? `Объектов: <b>${submission.objects}</b>` : null,
      submission.similarity != null ? `Схожесть с оригиналом: <b>${submission.similarity}%</b>` : null,
      ``,
      `Заявку подал: ${playerLink || submission.player}`,
      submission.notes ? `Заметки: ${submission.notes}` : null,
      ``,
      submission.videoUrl ? `🎥 <a href="${submission.videoUrl}">Видео</a>` : null,
      submission.rawUrl ? `📁 <a href="${submission.rawUrl}">Raw footage</a>` : null,
      submission.songUrl ? `🎵 <a href="${submission.songUrl}">Саундтрек</a>` : null,
    ].filter((x) => x !== null).join("\n");

    keyboard = {
      inline_keyboard: [[
        { text: "Принять ✅", callback_data: `sub_approve:${id}` },
        { text: "Отклонить ❌", callback_data: `sub_reject:${id}` },
      ]],
    };
  } else {
    const playerLink = profileLink(submission.player);
    text = [
      `🎮 <b>Новая заявка на рекорд</b>`,
      ``,
      `Игрок: ${playerLink || submission.player}`,
      `Уровень: <b>${submission.levelName || "—"}</b>`,
      `Прогресс: <b>${submission.progress}</b>`,
      submission.notes ? `Заметки: ${submission.notes}` : null,
      ``,
      submission.videoUrl ? `🎥 <a href="${submission.videoUrl}">Видео</a>` : null,
      submission.rawUrl ? `📁 <a href="${submission.rawUrl}">Raw footage</a>` : null,
    ].filter((x) => x !== null).join("\n");

    keyboard = {
      inline_keyboard: [[
        { text: "Одобрить ✅", callback_data: `sub_approve:${id}` },
        { text: "Отклонить ❌", callback_data: `sub_reject:${id}` },
        { text: "Забанить 🚫", callback_data: `sub_ban:${id}` },
      ]],
    };
  }

  const photo = isLevel && submission.previewImageUrl
    ? (submission.previewImageUrl.startsWith("http") ? submission.previewImageUrl : `${SITE_URL}${submission.previewImageUrl}`)
    : null;

  try {
    if (photo) {
      await tgRequest("sendPhoto", {
        chat_id: ADMIN_CHANNEL_ID,
        photo,
        caption: text,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      await tgRequest("sendMessage", {
        chat_id: ADMIN_CHANNEL_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: keyboard,
      });
    }
  } catch (err) {
    console.error("[TG] notifySubmission:", err.message);
  }
}

async function setupWebhook() {
  if (!BOT_TOKEN) return;
  const params = { url: `${SITE_URL}/api/tg-webhook` };
  if (WEBHOOK_SECRET) params.secret_token = WEBHOOK_SECRET;
  try {
    await tgRequest("setWebhook", params);
    console.log("[TG] Webhook registered:", params.url);
  } catch (err) {
    console.error("[TG] setWebhook failed:", err.message);
  }
}

async function answerCallbackQuery(callbackQueryId, text) {
  try {
    await tgRequest("answerCallbackQuery", { callback_query_id: callbackQueryId, text, show_alert: false });
  } catch (_) {}
}

// Update only the inline keyboard, preserving all message text and links
async function updateKeyboard(chatId, messageId, keyboard) {
  try {
    await tgRequest("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: keyboard,
    });
  } catch (_) {}
}

module.exports = {
  notifyLevelAdded,
  notifyLevelMoved,
  notifyLevelRemoved,
  notifySubmission,
  setupWebhook,
  answerCallbackQuery,
  updateKeyboard,
  WEBHOOK_SECRET: () => WEBHOOK_SECRET,
  SITE_URL,
};
