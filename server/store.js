const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { hashPassword } = require("./auth");
const { pool } = require("./db");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

const DEFAULT_RULES = [
  {
    id: "gameplay-similarity",
    title: { ru: "Похожесть на оригинал", en: "Similarity to the original" },
    body: {
      ru: "Нерф должен сохранять минимум 80% ощущения и структуры оригинального уровня. Сильное переписывание маршрута запрещено.",
      en: "A nerf must preserve at least 80% of the feel and structure of the original level. Heavy route rewrites are not allowed.",
    },
    points: [
      { ru: "Сохранять core click pattern", en: "Keep the core click pattern" },
      { ru: "Не ломать общий маршрут и ритм", en: "Do not break the overall route and rhythm" },
    ],
  },
  {
    id: "raw-footage",
    title: { ru: "Raw footage обязательно", en: "Raw footage is mandatory" },
    body: {
      ru: "Для рекордов, верификаций и спорных случаев нужен raw footage без обрезок на Google Drive со слышимыми кликами.",
      en: "For records, verifications and disputed cases, uncut Google Drive raw footage with audible clicks is required.",
    },
    points: [
      { ru: "Только Google Drive", en: "Google Drive only" },
      { ru: "Без монтажа и склеек", en: "No edits or cuts" },
    ],
  },
  {
    id: "anti-cheat",
    title: { ru: "Античит и баны", en: "Anti-cheat and bans" },
    body: {
      ru: "Если модерация находит читы, поддельный raw или серьезное нарушение правил, рекорд отклоняется, а игрок может получить бан на листе.",
      en: "If moderation finds cheats, fake raw footage or a serious rules violation, the record is rejected and the player may be banned from the list.",
    },
    points: [
      { ru: "Отклонение при подозрительном proof", en: "Rejection for suspicious proof" },
      { ru: "Бан при серьезных нарушениях", en: "Ban for serious violations" },
    ],
  },
];

let _cache = null;

function ts(val) {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

async function initStore() {
  const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
  await pool.query(schema);

  _cache = await loadFromDatabase();

  const { rows: userCountRows } = await pool.query("SELECT COUNT(*) AS cnt FROM users");
  if (Number(userCountRows[0].cnt) === 0) {
    const seededPassword = hashPassword("CorexDev123!");
    const user = {
      id: randomUUID(),
      nickname: "CorexDev",
      email: "vaqkat321@mail.ru",
      passwordSalt: seededPassword.salt,
      passwordHash: seededPassword.hash,
      role: "admin",
      countryCode: "RU",
      avatarUrl: "",
      bio: { ru: "Основной аккаунт владельца NDL.", en: "Primary owner account for NDL." },
      isBanned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    _cache.users.push(user);
    await writeStore(_cache);
  }

  const { rows: ruleCountRows } = await pool.query("SELECT COUNT(*) AS cnt FROM rules");
  if (Number(ruleCountRows[0].cnt) === 0) {
    _cache.rules = DEFAULT_RULES;
    await writeStore(_cache);
  }
}

async function loadFromDatabase() {
  const client = await pool.connect();
  try {
    const [usersR, sessionsR, levelsR, recordsR, historyR, submissionsR, rulesR, pointsR, settingsR] =
      await Promise.all([
        client.query("SELECT * FROM users ORDER BY created_at"),
        client.query("SELECT * FROM sessions"),
        client.query("SELECT * FROM levels ORDER BY rank"),
        client.query("SELECT * FROM records ORDER BY date DESC"),
        client.query("SELECT * FROM level_history ORDER BY date DESC"),
        client.query("SELECT * FROM submissions ORDER BY created_at DESC"),
        client.query("SELECT * FROM rules ORDER BY sort_order"),
        client.query("SELECT * FROM rule_points ORDER BY sort_order"),
        client.query("SELECT * FROM site_settings"),
      ]);

    const recordsByLevel = new Map();
    for (const r of recordsR.rows) {
      if (!recordsByLevel.has(r.level_id)) recordsByLevel.set(r.level_id, []);
      recordsByLevel.get(r.level_id).push({
        id: r.id,
        userId: r.user_id,
        player: r.player,
        progress: r.progress,
        videoUrl: r.video_url,
        date: ts(r.date),
      });
    }

    const historyByLevel = new Map();
    for (const h of historyR.rows) {
      if (!historyByLevel.has(h.level_id)) historyByLevel.set(h.level_id, []);
      historyByLevel.get(h.level_id).push({
        date: ts(h.date),
        rank: h.rank,
        note: { ru: h.note_ru || "", en: h.note_en || "" },
        changeType: h.change_type || null,
        aboveId: h.above_id || null,
        aboveName: h.above_name || null,
        belowId: h.below_id || null,
        belowName: h.below_name || null,
      });
    }

    const pointsByRule = new Map();
    for (const p of pointsR.rows) {
      if (!pointsByRule.has(p.rule_id)) pointsByRule.set(p.rule_id, []);
      pointsByRule.get(p.rule_id).push({ ru: p.text_ru, en: p.text_en });
    }

    const settings = new Map();
    for (const s of settingsR.rows) settings.set(s.key, s.value);

    return {
      siteSummary: {
        spotlightLevelId: settings.get("spotlightLevelId") || "",
        recentChanges: [],
      },
      users: usersR.rows.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        email: u.email,
        passwordSalt: u.password_salt,
        passwordHash: u.password_hash,
        role: u.role,
        countryCode: u.country_code,
        avatarUrl: u.avatar_url,
        bio: { ru: u.bio_ru || "", en: u.bio_en || "" },
        isBanned: u.is_banned,
        createdAt: ts(u.created_at),
        updatedAt: ts(u.updated_at),
      })),
      sessions: sessionsR.rows.map((s) => ({
        id: s.id,
        token: s.token,
        userId: s.user_id,
        expiresAt: ts(s.expires_at),
      })),
      levels: levelsR.rows.map((l) => ({
        id: l.id,
        rank: l.rank,
        segment: l.segment,
        name: l.name,
        creator: l.creator,
        creatorId: l.creator_id || null,
        verifier: l.verifier,
        verifierId: l.verifier_id || null,
        originalName: l.original_name,
        description: { ru: l.description_ru || "", en: l.description_en || "" },
        similarity: l.similarity,
        isNew: l.is_new,
        nerfedLevelId: l.nerfed_level_id,
        originalLevelId: l.original_level_id,
        originalPlacement: l.original_placement,
        password: l.password,
        length: l.length,
        objects: l.objects,
        version: l.version,
        songUrl: l.song_url,
        verificationUrl: l.verification_url,
        youtubeId: l.youtube_id,
        gdBrowserUrl: l.gd_browser_url,
        thumbnailUrl: l.thumbnail_url,
        score100: l.score_100,
        scoreProgress: l.score_progress,
        requiredProgress: l.required_progress,
        minProgress: l.min_progress != null ? Number(l.min_progress) : null,
        minProgressScore: l.min_progress_score != null ? Number(l.min_progress_score) : null,
        records: recordsByLevel.get(l.id) || [],
        history: historyByLevel.get(l.id) || [],
        createdAt: ts(l.created_at),
        updatedAt: ts(l.updated_at),
      })),
      submissions: submissionsR.rows.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        userId: s.user_id,
        player: s.player,
        countryCode: s.country_code,
        levelId: s.level_id,
        levelName: s.level_name,
        originalName: s.original_name,
        progress: s.progress,
        rawUrl: s.raw_url,
        videoUrl: s.video_url,
        notes: s.notes,
        moderationNote: s.moderation_note,
        reviewedBy: s.reviewed_by,
        originalPlacement: s.original_placement,
        similarity: s.similarity,
        previewImageUrl: s.preview_image_url,
        verifierNickname: s.verifier_nickname,
        nerfedLevelId: s.nerfed_level_id || null,
        originalLevelId: s.original_level_id || null,
        password: s.password || null,
        length: s.length || null,
        objects: s.objects || null,
        version: s.version || null,
        songUrl: s.song_url || null,
        verificationUrl: s.verification_url || null,
        descriptionRu: s.description_ru || null,
        descriptionEn: s.description_en || null,
        creatorNickname: s.creator_nickname || null,
        segment: s.segment || null,
        thumbnailData: s.thumbnail_data || null,
        minProgress: s.min_progress != null ? Number(s.min_progress) : null,
        minProgressScore: s.min_progress_score != null ? Number(s.min_progress_score) : null,
        createdAt: ts(s.created_at),
        updatedAt: ts(s.updated_at),
      })),
      rules: rulesR.rows.map((r) => ({
        id: r.id,
        title: { ru: r.title_ru, en: r.title_en },
        body: { ru: r.body_ru, en: r.body_en },
        points: pointsByRule.get(r.id) || [],
      })),
    };
  } finally {
    client.release();
  }
}

function readStore() {
  return _cache;
}

async function writeStore(store) {
  _cache = store;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM rule_points");
    await client.query("DELETE FROM rules");
    await client.query("DELETE FROM submissions");
    await client.query("DELETE FROM level_history");
    await client.query("DELETE FROM records");
    await client.query("DELETE FROM levels");
    await client.query("DELETE FROM users");
    await client.query("DELETE FROM site_settings");

    for (const u of store.users) {
      await client.query(
        `INSERT INTO users (id, nickname, email, password_hash, password_salt, role, country_code, avatar_url, bio_ru, bio_en, is_banned, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [u.id, u.nickname, u.email, u.passwordHash, u.passwordSalt, u.role,
         u.countryCode, u.avatarUrl, u.bio?.ru || "", u.bio?.en || "",
         u.isBanned, u.createdAt, u.updatedAt],
      );
    }

    for (const l of store.levels) {
      await client.query(
        `INSERT INTO levels (id, rank, segment, name, creator, creator_id, verifier, verifier_id,
         original_name, description_ru, description_en, similarity, is_new,
         nerfed_level_id, original_level_id, original_placement, password,
         length, objects, version, song_url, verification_url, youtube_id,
         gd_browser_url, thumbnail_url, score_100, score_progress,
         required_progress, min_progress, min_progress_score, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)`,
        [l.id, l.rank, l.segment, l.name, l.creator, l.creatorId || null,
         l.verifier, l.verifierId || null, l.originalName,
         l.description?.ru || "", l.description?.en || "",
         l.similarity, l.isNew, l.nerfedLevelId, l.originalLevelId,
         l.originalPlacement, l.password, l.length, l.objects, l.version,
         l.songUrl, l.verificationUrl, l.youtubeId, l.gdBrowserUrl,
         l.thumbnailUrl, l.score100, l.scoreProgress, l.requiredProgress,
         l.minProgress, l.minProgressScore,
         l.createdAt, l.updatedAt],
      );

      for (const r of l.records || []) {
        await client.query(
          `INSERT INTO records (id, level_id, user_id, player, progress, video_url, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [r.id || randomUUID(), l.id, r.userId || null, r.player, r.progress, r.videoUrl, r.date],
        );
      }

      for (const h of l.history || []) {
        const noteRu = typeof h.note === "object" ? h.note.ru || "" : String(h.note || "");
        const noteEn = typeof h.note === "object" ? h.note.en || "" : String(h.note || "");
        await client.query(
          `INSERT INTO level_history (level_id, rank, note_ru, note_en, date, change_type, above_id, above_name, below_id, below_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [l.id, h.rank, noteRu, noteEn, h.date, h.changeType || null, h.aboveId || null, h.aboveName || null, h.belowId || null, h.belowName || null],
        );
      }
    }

    const levelIds = new Set(store.levels.map((l) => l.id));
    for (const s of store.submissions) {
      // guard: nullify levelId if the level was deleted (prevents FK violation)
      if (s.levelId && !levelIds.has(s.levelId)) s.levelId = null;
      await client.query(
        `INSERT INTO submissions (id, type, status, user_id, player, country_code, level_id,
         level_name, original_name, progress, raw_url, video_url, notes,
         moderation_note, reviewed_by, original_placement, similarity,
         preview_image_url, verifier_nickname,
         nerfed_level_id, original_level_id, password, length, objects, version,
         song_url, verification_url, description_ru, description_en,
         creator_nickname, segment, thumbnail_data, min_progress, min_progress_score,
         created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)`,
        [s.id, s.type, s.status, s.userId, s.player, s.countryCode,
         s.levelId || null, s.levelName, s.originalName, s.progress,
         s.rawUrl, s.videoUrl, s.notes, s.moderationNote,
         s.reviewedBy || null, s.originalPlacement || null,
         s.similarity || null, s.previewImageUrl || null,
         s.verifierNickname || null,
         s.nerfedLevelId || null, s.originalLevelId || null,
         s.password || null, s.length || null, s.objects || null, s.version || null,
         s.songUrl || null, s.verificationUrl || null,
         s.descriptionRu || null, s.descriptionEn || null,
         s.creatorNickname || null, s.segment || null, s.thumbnailData || null,
         s.minProgress, s.minProgressScore,
         s.createdAt, s.updatedAt],
      );
    }

    for (let i = 0; i < store.rules.length; i++) {
      const r = store.rules[i];
      await client.query(
        `INSERT INTO rules (id, title_ru, title_en, body_ru, body_en, sort_order) VALUES ($1,$2,$3,$4,$5,$6)`,
        [r.id, r.title?.ru || "", r.title?.en || "", r.body?.ru || "", r.body?.en || "", i],
      );
      for (let j = 0; j < (r.points || []).length; j++) {
        const p = r.points[j];
        await client.query(
          `INSERT INTO rule_points (rule_id, text_ru, text_en, sort_order) VALUES ($1,$2,$3,$4)`,
          [r.id, p.ru || "", p.en || "", j],
        );
      }
    }

    await client.query(
      `INSERT INTO site_settings (key, value) VALUES ('spotlightLevelId', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [store.siteSummary?.spotlightLevelId || ""],
    );

    for (const s of store.sessions || []) {
      await client.query(
        `INSERT INTO sessions (id, token, user_id, expires_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [s.id, s.token, s.userId, s.expiresAt],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("writeStore error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { DEFAULT_RULES, initStore, readStore, writeStore };
