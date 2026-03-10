const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");
const DATA_FILE = path.join(__dirname, "..", "data", "store.json");

async function migrate() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log("No store.json found — nothing to migrate.");
    return;
  }

  const store = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  console.log("Loaded store.json:");
  console.log(`  Users: ${(store.users || []).length}`);
  console.log(`  Sessions: ${(store.sessions || []).length}`);
  console.log(`  Levels: ${(store.levels || []).length}`);
  console.log(`  Submissions: ${(store.submissions || []).length}`);
  console.log(`  Rules: ${(store.rules || []).length}`);

  const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
  await pool.query(schema);
  console.log("Schema created.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const u of store.users || []) {
      await client.query(
        `INSERT INTO users (id, nickname, email, password_hash, password_salt, role, country_code, avatar_url, bio_ru, bio_en, is_banned, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.nickname, u.email, u.passwordHash, u.passwordSalt, u.role,
         u.countryCode, u.avatarUrl || "", u.bio?.ru || "", u.bio?.en || "",
         u.isBanned || false, u.createdAt, u.updatedAt],
      );
    }
    console.log("  Users migrated.");

    for (const s of store.sessions || []) {
      await client.query(
        `INSERT INTO sessions (id, token, user_id, expires_at) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.token, s.userId, s.expiresAt],
      );
    }
    console.log("  Sessions migrated.");

    for (const l of store.levels || []) {
      await client.query(
        `INSERT INTO levels (id, rank, segment, name, creator, creator_id, verifier, verifier_id,
         original_name, description_ru, description_en, similarity, is_new,
         nerfed_level_id, original_level_id, original_placement, password,
         length, objects, version, song_url, verification_url, youtube_id,
         gd_browser_url, thumbnail_url, score_100, score_progress,
         required_progress, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
         ON CONFLICT (id) DO NOTHING`,
        [l.id, l.rank, l.segment, l.name, l.creator, l.creatorId || null,
         l.verifier, l.verifierId || null, l.originalName,
         l.description?.ru || "", l.description?.en || "",
         l.similarity || 80, l.isNew !== false, l.nerfedLevelId, l.originalLevelId,
         l.originalPlacement, l.password || "Free Copy", l.length || "Unknown",
         l.objects || "Unknown", l.version || "2.2", l.songUrl || "",
         l.verificationUrl, l.youtubeId || "", l.gdBrowserUrl || "",
         l.thumbnailUrl || "", l.score100 || "0", l.scoreProgress || "0",
         l.requiredProgress || "0%", l.createdAt, l.updatedAt],
      );

      for (const r of l.records || []) {
        const { randomUUID } = require("crypto");
        await client.query(
          `INSERT INTO records (id, level_id, user_id, player, progress, video_url, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [r.id || randomUUID(), l.id, r.userId || null, r.player, r.progress, r.videoUrl, r.date],
        );
      }

      await client.query("DELETE FROM level_history WHERE level_id = $1", [l.id]);
      for (const h of l.history || []) {
        const noteRu = typeof h.note === "object" ? h.note.ru || "" : String(h.note || "");
        const noteEn = typeof h.note === "object" ? h.note.en || "" : String(h.note || "");
        await client.query(
          `INSERT INTO level_history (level_id, rank, note_ru, note_en, date) VALUES ($1,$2,$3,$4,$5)`,
          [l.id, h.rank, noteRu, noteEn, h.date],
        );
      }
    }
    console.log("  Levels + records + history migrated.");

    for (const s of store.submissions || []) {
      await client.query(
        `INSERT INTO submissions (id, type, status, user_id, player, country_code, level_id,
         level_name, original_name, progress, raw_url, video_url, notes,
         moderation_note, reviewed_by, original_placement, similarity,
         preview_image_url, verifier_nickname, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.type, s.status, s.userId, s.player, s.countryCode,
         s.levelId || null, s.levelName, s.originalName, s.progress,
         s.rawUrl, s.videoUrl, s.notes || "", s.moderationNote || "",
         s.reviewedBy || null, s.originalPlacement || null,
         s.similarity || null, s.previewImageUrl || null,
         s.verifierNickname || null, s.createdAt, s.updatedAt],
      );
    }
    console.log("  Submissions migrated.");

    await client.query("DELETE FROM rule_points");
    for (let i = 0; i < (store.rules || []).length; i++) {
      const r = store.rules[i];
      await client.query(
        `INSERT INTO rules (id, title_ru, title_en, body_ru, body_en, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
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
    console.log("  Rules migrated.");

    await client.query(
      `INSERT INTO site_settings (key, value) VALUES ('spotlightLevelId', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [store.siteSummary?.spotlightLevelId || ""],
    );

    await client.query("COMMIT");
    console.log("Migration complete!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
