const { pool } = require("./db");

const LEVEL_COLUMNS = [
  "ALTER TABLE levels ADD COLUMN IF NOT EXISTS min_progress NUMERIC DEFAULT NULL",
  "ALTER TABLE levels ADD COLUMN IF NOT EXISTS min_progress_score NUMERIC DEFAULT NULL",
];

const SUBMISSION_COLUMNS = [
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS nerfed_level_id VARCHAR(100)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS original_level_id VARCHAR(100)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS password VARCHAR(100)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS length VARCHAR(50)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS objects VARCHAR(50)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS version VARCHAR(20)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS song_url TEXT",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS verification_url TEXT",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS description_ru TEXT",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS description_en TEXT",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS creator_nickname VARCHAR(255)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS segment VARCHAR(20)",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS thumbnail_data TEXT",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS min_progress NUMERIC",
  "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS min_progress_score NUMERIC",
];

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== Migration v2 ===\n");

    console.log("Adding columns to levels...");
    for (const sql of LEVEL_COLUMNS) {
      await client.query(sql);
      console.log("  OK:", sql.split("ADD COLUMN IF NOT EXISTS ")[1]);
    }

    console.log("\nAdding columns to submissions...");
    for (const sql of SUBMISSION_COLUMNS) {
      await client.query(sql);
      console.log("  OK:", sql.split("ADD COLUMN IF NOT EXISTS ")[1]);
    }

    // Recalculate scores with new formula: top-1 = 1000, each rank -40, min 20
    console.log("\nRecalculating level scores with new formula...");
    const { rows: levels } = await client.query("SELECT id, rank FROM levels ORDER BY rank");
    for (const level of levels) {
      const score100 = Math.max(20, 1000 - (level.rank - 1) * 40);
      const scoreProgress = Math.max(1, Math.round(score100 * 0.3));
      let requiredProgress;
      if (level.rank <= 75) requiredProgress = "50%";
      else if (level.rank <= 150) requiredProgress = "30%";
      else requiredProgress = "20%";

      await client.query(
        "UPDATE levels SET score_100 = $1, score_progress = $2, required_progress = $3 WHERE id = $4",
        [String(score100), String(scoreProgress), requiredProgress, level.id],
      );
      console.log(`  Rank #${level.rank}: ${score100} pts`);
    }

    console.log("\nMigration v2 complete!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
