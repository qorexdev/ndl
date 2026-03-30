const { randomUUID } = require("crypto");
const { slugify, isGoogleDriveLink, parseYouTubeId } = require("./utils");

function countryPayload(countryByCode, countryCode) {
  const country = countryByCode.get(countryCode) || null;
  return {
    code: countryCode || "",
    flag: country?.flag || "",
    name: country?.name || {
      ru: countryCode || "",
      en: countryCode || "",
    },
  };
}

function sanitizeUserForClient(user, countryByCode, { includeEmail = false } = {}) {
  const country = countryPayload(countryByCode, user.countryCode);

  return {
    id: user.id,
    nickname: user.nickname,
    ...(includeEmail ? { email: user.email } : {}),
    role: user.role,
    countryCode: country.code,
    country: country.name,
    flag: country.flag,
    avatarUrl: user.avatarUrl || "",
    bio: user.bio || { ru: "", en: "" },
    isBanned: Boolean(user.isBanned),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function numericScore(value) {
  return Number.parseFloat(String(value || "0").replace(",", ".")) || 0;
}

function progressNumber(progress) {
  const str = String(progress || "").trim();

  const match = str.match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (match) return Number.parseFloat(match[1]);

  const fallback = str.match(/(\d+(?:\.\d+)?)%/);
  return fallback ? Number.parseFloat(fallback[1]) : 0;
}

function calculateLevelPoints(rank, totalLevels) {
  if (!rank || rank < 1) return { score100: "0", scoreProgress: "0", requiredProgress: "0%" };

  // Top-1 = 1000, each subsequent rank -40 points, minimum 20
  const score100 = Math.max(20, 1000 - (rank - 1) * 40);
  const scoreProgress = Math.max(1, Math.round(score100 * 0.3));
  let requiredProgress;
  if (rank <= 75) {
    requiredProgress = "50%";
  } else if (rank <= 150) {
    requiredProgress = "30%";
  } else {
    requiredProgress = "20%";
  }

  return {
    score100: String(score100),
    scoreProgress: String(scoreProgress),
    requiredProgress,
  };
}

function recordScore(level, record) {
  const progress = progressNumber(record.progress);
  const score100 = numericScore(level.score100);

  if (progress >= 100) {
    return score100;
  }

  if (level.minProgress != null && level.minProgressScore != null) {
    const minProg = Number(level.minProgress);
    const minScore = Number(level.minProgressScore);

    if (progress < minProg) return 0;

    const t = (progress - minProg) / (100 - minProg);
    const score = minScore + (score100 - minScore) * Math.pow(t, 1.5);
    return Number(score.toFixed(2));
  }

  const minimum = progressNumber(level.requiredProgress);
  if (progress < minimum) {
    return 0;
  }

  return Number((numericScore(level.scoreProgress) * (progress / 100)).toFixed(2));
}

function buildPlayerLeaderboard(store, countryByCode) {
  const acceptedRecords = [];

  for (const level of store.levels) {
    for (const record of level.records || []) {
      acceptedRecords.push({
        ...record,
        levelId: level.id,
        levelName: level.name,
        levelRank: level.rank,
        levelRequiredProgress: level.requiredProgress,
        levelScore100: level.score100,
        levelScoreProgress: level.scoreProgress,
        levelMinProgress: level.minProgress,
        levelMinProgressScore: level.minProgressScore,
      });
    }
  }

  return store.users
    .filter((user) => !user.isBanned)
    .map((user) => {
      const userRecords = acceptedRecords.filter((record) => record.userId === user.id);

      const bestByLevel = new Map();
      for (const record of userRecords) {
        const pts = recordScore(
          {
            requiredProgress: record.levelRequiredProgress,
            score100: record.levelScore100,
            scoreProgress: record.levelScoreProgress,
            minProgress: record.levelMinProgress,
            minProgressScore: record.levelMinProgressScore,
          },
          record,
        );
        const existing = bestByLevel.get(record.levelId);
        if (!existing || pts > existing.pts) {
          bestByLevel.set(record.levelId, { pts, record });
        }
      }

      let score = 0;
      for (const { pts } of bestByLevel.values()) {
        score += pts;
      }
      score = Number(score.toFixed(2));

      for (const level of store.levels) {
        if (level.verifierId === user.id || level.verifier.toLowerCase() === user.nickname.toLowerCase()) {
          score += Number(level.score100 || 0);
        }
      }
      score = Number(score.toFixed(2));

      const completions = userRecords.filter((record) => progressNumber(record.progress) >= 100).length;
      const hardestRecord = [...userRecords].filter((record) => progressNumber(record.progress) >= 100).sort((left, right) => left.levelRank - right.levelRank)[0];

      let hardest = hardestRecord ? { name: hardestRecord.levelName, rank: hardestRecord.levelRank, id: hardestRecord.levelId } : null;
      for (const level of store.levels) {
        if (level.verifierId === user.id || level.verifier.toLowerCase() === user.nickname.toLowerCase()) {
          if (!hardest || level.rank < hardest.rank) {
            hardest = { name: level.name, rank: level.rank, id: level.id };
          }
        }
      }

      return {
        ...sanitizeUserForClient(user, countryByCode),
        score,
        completions,
        hardest: hardest ? hardest.name : "-",
        hardestId: hardest ? hardest.id : null,
        hardestRank: hardest ? hardest.rank : 9999,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.nickname.localeCompare(right.nickname);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function buildCountryLeaderboard(store, countryByCode) {
  const players = buildPlayerLeaderboard(store, countryByCode);
  const grouped = new Map();

  for (const player of players) {
    const existing = grouped.get(player.countryCode) || {
      id: player.countryCode.toLowerCase(),
      name: player.country,
      flag: player.flag,
      code: player.countryCode,
      score: 0,
      players: 0,
      records: 0,
      topPlayer: "-",
      topPlayerScore: 0,
      description: {
        ru: "Статистика страны по принятым рекордам NDL.",
        en: "Country statistics for accepted NDL records.",
      },
    };

    existing.score += player.score;
    existing.players += 1;
    existing.records += player.completions;

    if (player.score >= existing.topPlayerScore) {
      existing.topPlayer = player.nickname;
      existing.topPlayerScore = player.score;
    }

    grouped.set(player.countryCode, existing);
  }

  return [...grouped.values()]
    .sort((left, right) => right.score - left.score)
    .map((entry, index) => ({
      ...entry,
      score: Number(entry.score.toFixed(2)),
      rank: index + 1,
    }));
}

function buildActivityFeed(store) {
  const activities = [];

  for (const level of store.levels) {
    if (Array.isArray(level.history)) {
      for (const entry of level.history) {
        activities.push({
          date: entry.date,
          levelName: level.name,
          levelId: level.id,
          text: entry.note,
          rank: entry.rank,
          changeType: entry.changeType || null,
          aboveId: entry.aboveId || null,
          aboveName: entry.aboveName || null,
          belowId: entry.belowId || null,
          belowName: entry.belowName || null,
        });
      }
    }
  }

  activities.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const grouped = [];
  const seen = new Set();
  for (const activity of activities.slice(0, 30)) {
    const dateKey = activity.date.split("T")[0];
    if (!seen.has(dateKey)) {
      seen.add(dateKey);
      grouped.push({ date: activity.date, items: [] });
    }
    const group = grouped.find((g) => g.date.split("T")[0] === dateKey);
    if (group && group.items.length < 10) {
      group.items.push({
        levelName: activity.levelName,
        levelId: activity.levelId,
        text: activity.text,
        changeType: activity.changeType || null,
        aboveId: activity.aboveId || null,
        aboveName: activity.aboveName || null,
        belowId: activity.belowId || null,
        belowName: activity.belowName || null,
      });
    }
  }

  return grouped.slice(0, 7);
}

function computeSummary(store, countryByCode) {
  return {
    spotlightLevelId: store.siteSummary.spotlightLevelId || store.levels[0]?.id || "",
    recentChanges: buildActivityFeed(store),
    stats: {
      users: store.users.filter((user) => !user.isBanned).length,
      records: store.levels.reduce((sum, level) => sum + (level.records?.length || 0), 0),
      levels: store.levels.length,
      countries: buildCountryLeaderboard(store, countryByCode).length,
    },
  };
}

function normalizeLevelRanks(store) {
  store.levels = [...store.levels]
    .sort((left, right) => Number(left.rank || 0) - Number(right.rank || 0))
    .map((level, index) => {
      const newRank = index + 1;
      const points = calculateLevelPoints(newRank, store.levels.length);
      const autoMinProgressScore = (level.minProgress != null && !level.minProgressScore)
        ? Number(points.score100)
        : level.minProgressScore;
      return {
        ...level,
        rank: newRank,
        score100: points.score100,
        scoreProgress: points.scoreProgress,
        requiredProgress: points.requiredProgress,
        minProgressScore: autoMinProgressScore,
      };
    });
}

function appendLevelHistory(level, rank, text, neighbors = null) {
  level.history = Array.isArray(level.history) ? level.history : [];
  level.history.unshift({
    date: new Date().toISOString(),
    rank,
    note: text,
    changeType: neighbors ? neighbors.changeType : null,
    aboveId: neighbors ? neighbors.aboveId : null,
    aboveName: neighbors ? neighbors.aboveName : null,
    belowId: neighbors ? neighbors.belowId : null,
    belowName: neighbors ? neighbors.belowName : null,
  });
  level.history = level.history.slice(0, 20);
}

function sanitizeLevelInput(input, existingLevel = null) {
  const requiredFields = [
    "name",
    "originalName",
    "creatorNickname",
    "nerfedLevelId",
    "originalLevelId",
    "originalPlacement",
    "verificationUrl",
  ];

  for (const field of requiredFields) {
    if (!String(input[field] || "").trim()) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const id = existingLevel?.id || slugify(input.name);
  if (!id) {
    throw new Error("Invalid level name");
  }

  const nextRank = Number(input.rank || existingLevel?.rank || 1);
  const segment = ["main", "extended", "legacy"].includes(String(input.segment))
    ? String(input.segment)
    : "main";

  const verificationUrl = String(input.verificationUrl).trim();
  const youtubeId = parseYouTubeId(verificationUrl);

  if (!youtubeId) {
    throw new Error("Verification URL must be a valid YouTube link");
  }

  let thumbnailUrl = String(input.thumbnailUrl || existingLevel?.thumbnailUrl || "").trim();
  if (!thumbnailUrl || thumbnailUrl.includes("i.ytimg.com") || parseYouTubeId(thumbnailUrl)) {
    thumbnailUrl = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
  }

  const clampedRank = Number.isFinite(nextRank) && nextRank > 0 ? nextRank : 1;

  return {
    id,
    rank: clampedRank,
    segment,
    name: String(input.name).trim(),
    creator: String(input.creatorNickname).trim(),
    creatorId: String(input.creatorId || "").trim() || null,
    verifier: String(input.verifierNickname || input.creatorNickname).trim(),
    verifierId: String(input.verifierId || "").trim() || null,
    originalName: String(input.originalName).trim(),
    description: {
      ru: String(input.descriptionRu || "").trim(),
      en: String(input.descriptionEn || "").trim() || String(input.descriptionRu || "").trim(),
    },
    similarity: Number(input.similarity || 80),
    isNew: existingLevel ? existingLevel.isNew : true,
    nerfedLevelId: String(input.nerfedLevelId).trim(),
    originalLevelId: String(input.originalLevelId).trim(),
    originalPlacement: String(input.originalPlacement).trim(),
    password: String(input.password || "Free Copy").trim(),
    length: String(input.length || "Unknown").trim(),
    objects: String(input.objects || "Unknown").trim(),
    version: String(input.version || "2.2").trim(),
    songUrl: String(input.songUrl || "").trim(),
    verificationUrl,
    youtubeId,
    gdBrowserUrl: `https://gdbrowser.com/${String(input.nerfedLevelId).trim()}`,
    thumbnailUrl,
    score100: "0",
    scoreProgress: "0",
    requiredProgress: "0%",
    minProgress: input.minProgress != null ? Number(input.minProgress) : (existingLevel?.minProgress ?? null),
    minProgressScore: input.minProgressScore != null ? Number(input.minProgressScore) : (existingLevel?.minProgressScore ?? null),
    records: existingLevel?.records || [],
    history: existingLevel?.history || [],
    createdAt: existingLevel?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeSubmissionInput(input, user, store) {
  const type = String(input.type || "").trim();

  if (!["record", "level"].includes(type)) {
    throw new Error("Invalid submission type");
  }

  if (!isGoogleDriveLink(input.rawUrl)) {
    throw new Error("Raw footage must be a Google Drive link");
  }

  if (!String(input.videoUrl || "").trim()) {
    throw new Error("Video URL is required");
  }

  const songUrl = String(input.songUrl || "").trim();
  if (songUrl && !songUrl.includes("newgrounds.com")) {
    throw new Error("Song URL must be from Newgrounds (newgrounds.com)");
  }

  const baseSubmission = {
    id: randomUUID(),
    type,
    status: "pending",
    userId: user.id,
    player: user.nickname,
    countryCode: user.countryCode,
    rawUrl: String(input.rawUrl).trim(),
    videoUrl: String(input.videoUrl).trim(),
    notes: String(input.notes || "").trim(),
    moderationNote: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (type === "record") {
    const level = store.levels.find((entry) => entry.id === String(input.levelId || "").trim());
    if (!level) {
      throw new Error("Selected level was not found");
    }

    if (!String(input.progress || "").trim()) {
      throw new Error("Progress is required");
    }

    let progressStr = String(input.progress).trim();
    if (/^\d+(?:\.\d+)?$/.test(progressStr)) progressStr += "%";

    return {
      ...baseSubmission,
      levelId: level.id,
      levelName: level.name,
      originalName: level.originalName,
      progress: progressStr,
    };
  }

  const requiredFields = ["proposalName", "originalLevelName", "originalPlacement"];
  for (const field of requiredFields) {
    if (!String(input[field] || "").trim()) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return {
    ...baseSubmission,
    levelId: null,
    levelName: String(input.proposalName).trim(),
    originalName: String(input.originalLevelName).trim(),
    originalPlacement: String(input.originalPlacement).trim(),
    similarity: Number(input.similarity || 80),
    previewImageUrl: String(input.previewImageUrl || "").trim(),
    verifierNickname: String(input.verifierNickname || "").trim(),
    progress: "Application",

    proposedRank: input.proposedRank ? Number(input.proposedRank) : null,
    nerfedLevelId: String(input.nerfedLevelId || "").trim(),
    originalLevelId: String(input.originalLevelId || "").trim(),
    length: String(input.length || "").trim(),
    objects: String(input.objects || "").trim(),
    version: String(input.version || "").trim(),
    songUrl: String(input.songUrl || "").trim(),
    descriptionRu: String(input.descriptionRu || "").trim(),
    descriptionEn: String(input.descriptionEn || "").trim(),
    creatorNickname: String(input.creatorNickname || "").trim(),
    segment: String(input.segment || "").trim(),
    thumbnailData: input.thumbnailData || null,
    minProgress: input.minProgress != null ? Number(input.minProgress) : null,
    minProgressScore: input.minProgressScore != null ? Number(input.minProgressScore) : null,
  };
}

function applySubmissionDecision(store, submission, action, moderator, moderationNote = "") {
  const nextStatus = {
    approve: "approved",
    reject: "rejected",
    ban: "banned",
    revise: "revision",
  }[action];

  if (!nextStatus) {
    throw new Error("Invalid moderation action");
  }

  submission.status = nextStatus;
  submission.moderationNote = String(moderationNote || submission.moderationNote || "").trim();
  submission.reviewedBy = moderator.nickname;
  submission.updatedAt = new Date().toISOString();

  if (action === "ban") {
    const player = store.users.find((user) => user.id === submission.userId);
    if (player) {
      player.isBanned = true;
      player.updatedAt = new Date().toISOString();
    }
  }

  if (action !== "approve") {
    return submission;
  }

  if (submission.type === "record") {
    const level = store.levels.find((entry) => entry.id === submission.levelId);
    if (level) {
      const exists = (level.records || []).some(
        (record) =>
          record.userId === submission.userId &&
          record.progress === submission.progress &&
          record.videoUrl === submission.videoUrl,
      );

      if (!exists) {
        level.records = Array.isArray(level.records) ? level.records : [];
        level.records.unshift({
          id: randomUUID(),
          userId: submission.userId,
          player: submission.player,
          progress: submission.progress,
          videoUrl: submission.videoUrl,
          date: submission.updatedAt,
        });
      }
    }
  }

  return submission;
}

module.exports = {
  appendLevelHistory,
  applySubmissionDecision,
  buildCountryLeaderboard,
  buildPlayerLeaderboard,
  calculateLevelPoints,
  computeSummary,
  countryPayload,
  normalizeLevelRanks,
  recordScore,
  sanitizeLevelInput,
  sanitizeSubmissionInput,
  sanitizeUserForClient,
};
