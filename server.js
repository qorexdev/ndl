const http = require("http");
const { randomUUID } = require("crypto");
const { COUNTRIES, COUNTRY_BY_CODE } = require("./server/countries");
const {
  createSession,
  getTokenFromRequest,
  getUserFromRequest,
  hashPassword,
  revokeSession,
  verifyPassword,
} = require("./server/auth");
const { initStore, readStore, writeStore } = require("./server/store");
const {
  appendLevelHistory,
  applySubmissionDecision,
  buildCountryLeaderboard,
  buildPlayerLeaderboard,
  computeSummary,
  normalizeLevelRanks,
  recordScore,
  sanitizeLevelInput,
  sanitizeSubmissionInput,
  sanitizeUserForClient,
} = require("./server/model");
const {
  badRequest,
  forbidden,
  getRequestBody,
  methodNotAllowed,
  notFound,
  saveUploadedImage,
  sendJson,
  sendJsonPublic,
  serveStatic,
  unauthorized,
} = require("./server/utils");

const { notifyLevelAdded, notifyLevelMoved, notifyLevelRemoved } = require("./server/telegram");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);

const CLEAN_PAGES = new Set([
  "list", "leaderboard", "submit", "rules", "moderation",
  "account", "level", "user", "api", "accounts", "submissions",
]);

const authAttempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const record = authAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + 60000;
  }
  record.count++;
  authAttempts.set(ip, record);
  return record.count <= 20;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket.remoteAddress;
}

function findUserByIdentifier(store, identifier) {
  const value = String(identifier || "").trim().toLowerCase();
  return store.users.find(
    (user) =>
      user.nickname.toLowerCase() === value ||
      user.email.toLowerCase() === value,
  );
}

function requireAuth(store, req, res) {
  const user = getUserFromRequest(store, req);
  if (!user) {
    unauthorized(res);
    return null;
  }
  if (user.isBanned) {
    forbidden(res, "This account is banned");
    return null;
  }
  return user;
}

function requireRole(store, req, res, roles) {
  const user = requireAuth(store, req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    forbidden(res, "You do not have access to this section");
    return null;
  }
  return user;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function sessionPayload(user) {
  return {
    user: sanitizeUserForClient(user, COUNTRY_BY_CODE, { includeEmail: true }),
  };
}

async function handleAuthRoutes(store, req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/auth/session") {
    const user = getUserFromRequest(store, req);
    sendJson(res, 200, user && !user.isBanned ? sessionPayload(user) : { user: null });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/register") {
    if (!checkRateLimit(getClientIp(req))) {
      sendJson(res, 429, { error: "Too many requests. Try again later." });
      return true;
    }
    try {
      const body = await getRequestBody(req);
      const nickname = String(body.nickname || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (!nickname || nickname.length < 3) {
        badRequest(res, "Nickname must be at least 3 characters long");
        return true;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
        badRequest(res, "Nickname can only contain letters, numbers, hyphens and underscores");
        return true;
      }
      if (!isValidEmail(email)) {
        badRequest(res, "A valid email is required");
        return true;
      }
      if (password.length < 8) {
        badRequest(res, "Password must be at least 8 characters long");
        return true;
      }
      if (store.users.some((user) => user.nickname.toLowerCase() === nickname.toLowerCase())) {
        badRequest(res, "Nickname is already taken");
        return true;
      }
      if (store.users.some((user) => user.email.toLowerCase() === email)) {
        badRequest(res, "Email is already registered");
        return true;
      }

      const rawCountry = String(body.countryCode || "").trim().toUpperCase();
      if (!COUNTRY_BY_CODE.has(rawCountry)) {
        badRequest(res, "Country is required");
        return true;
      }
      const countryCode = rawCountry;

      const passwordPayload = hashPassword(password);

      let avatarUrl = String(body.avatarUrl || "").trim();
      if (body.avatarData) {
        const uploaded = saveUploadedImage(body.avatarData);
        if (uploaded) avatarUrl = uploaded;
      }

      const user = {
        id: randomUUID(),
        nickname,
        email,
        passwordSalt: passwordPayload.salt,
        passwordHash: passwordPayload.hash,
        role: "player",
        countryCode,
        avatarUrl,
        bio: { ru: "", en: "" },
        isBanned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.users.push(user);
      const token = await createSession(store, user.id);
      await writeStore(store);

      sendJson(res, 201, {
        token,
        user: sanitizeUserForClient(user, COUNTRY_BY_CODE, { includeEmail: true }),
      });
    } catch (error) {
      badRequest(res, error.message);
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    if (!checkRateLimit(getClientIp(req))) {
      sendJson(res, 429, { error: "Too many requests. Try again later." });
      return true;
    }
    try {
      const body = await getRequestBody(req);
      const user = findUserByIdentifier(store, body.identifier);

      if (!user || !verifyPassword(String(body.password || ""), user)) {
        unauthorized(res, "Invalid credentials");
        return true;
      }
      if (user.isBanned) {
        forbidden(res, "This account is banned");
        return true;
      }

      const token = await createSession(store, user.id);

      sendJson(res, 200, { token, ...sessionPayload(user) });
    } catch (error) {
      badRequest(res, error.message);
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const token = getTokenFromRequest(req);
    if (token) {
      await revokeSession(store, token);
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  return false;
}

async function handleAccountRoutes(store, req, res, pathname) {
  if (req.method === "PATCH" && pathname === "/api/account/profile") {
    const user = requireAuth(store, req, res);
    if (!user) return true;

    try {
      const body = await getRequestBody(req);
      if (body.countryCode !== undefined) {
        const rawCountry = String(body.countryCode || "").trim().toUpperCase();
        user.countryCode = COUNTRY_BY_CODE.has(rawCountry) ? rawCountry : "";
      }

      if (body.avatarData) {
        const uploaded = saveUploadedImage(body.avatarData);
        if (uploaded) user.avatarUrl = uploaded;
      } else if (body.avatarUrl !== undefined) {
        user.avatarUrl = String(body.avatarUrl || "").trim();
      }

      user.bio = {
        ru: String(body.bioRu || "").trim(),
        en: String(body.bioEn || "").trim() || String(body.bioRu || "").trim(),
      };
      user.updatedAt = new Date().toISOString();

      await writeStore(store);
      sendJson(res, 200, {
        user: sanitizeUserForClient(user, COUNTRY_BY_CODE, { includeEmail: true }),
      });
    } catch (error) {
      badRequest(res, error.message);
    }
    return true;
  }

  if (req.method === "POST" && pathname === "/api/account/password") {
    const user = requireAuth(store, req, res);
    if (!user) return true;

    try {
      const body = await getRequestBody(req);
      if (!verifyPassword(String(body.currentPassword || ""), user)) {
        unauthorized(res, "Current password is incorrect");
        return true;
      }

      const nextPassword = String(body.nextPassword || "");
      if (nextPassword.length < 8) {
        badRequest(res, "New password must be at least 8 characters long");
        return true;
      }

      const nextPayload = hashPassword(nextPassword);
      user.passwordSalt = nextPayload.salt;
      user.passwordHash = nextPayload.hash;
      user.updatedAt = new Date().toISOString();

      await writeStore(store);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      badRequest(res, error.message);
    }
    return true;
  }

  return false;
}

async function handleApi(req, res) {
  const store = readStore();
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (await handleAuthRoutes(store, req, res, pathname)) return;
  if (await handleAccountRoutes(store, req, res, pathname)) return;

  if (req.method === "GET" && pathname === "/api/countries") {
    sendJsonPublic(res, COUNTRIES, 3600);
    return;
  }

  if (req.method === "GET" && pathname === "/api/site-summary") {
    sendJsonPublic(res, computeSummary(store, COUNTRY_BY_CODE), 30);
    return;
  }

  if (req.method === "POST" && pathname === "/api/upload") {
    const user = requireAuth(store, req, res);
    if (!user) return;
    try {
      const body = await getRequestBody(req);
      const imageUrl = saveUploadedImage(body.image);
      if (!imageUrl) {
        badRequest(res, "Invalid image data. Send a base64 data URL (PNG, JPEG, WebP, GIF).");
        return;
      }
      sendJson(res, 201, { url: imageUrl });
    } catch (error) {
      badRequest(res, error.message);
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/levels") {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    sendJsonPublic(res, [...store.levels].sort((left, right) => left.rank - right.rank).map((l) => ({
      ...l,
      isNew: l.createdAt ? (now - new Date(l.createdAt).getTime()) < ONE_DAY : false,
    })), 30);
    return;
  }

  if (req.method === "POST" && pathname === "/api/levels") {
    const user = requireRole(store, req, res, ["moderator", "admin"]);
    if (!user) return;
    try {
      const body = await getRequestBody(req);
      if (body.thumbnailData) {
        const uploaded = saveUploadedImage(body.thumbnailData);
        if (uploaded) body.thumbnailUrl = uploaded;
      }

      const level = sanitizeLevelInput(body);
      if (level.creatorId && !store.users.some((u) => u.id === level.creatorId)) {
        badRequest(res, "Creator not found among registered users");
        return;
      }
      if (level.verifierId && !store.users.some((u) => u.id === level.verifierId)) {
        badRequest(res, "Verifier not found among registered users");
        return;
      }
      if (store.levels.some((entry) => entry.id === level.id)) {
        badRequest(res, "A level with this name already exists");
        return;
      }

      level.rank = level.rank - 0.5;

      store.levels.push(level);
      normalizeLevelRanks(store);

      const actualLevel = store.levels.find((l) => l.id === level.id);
      const addedSorted = [...store.levels].sort((a, b) => a.rank - b.rank);
      const addedAbove = addedSorted.find((l) => l.rank === actualLevel.rank - 1 && l.id !== actualLevel.id);
      const addedBelow = addedSorted.find((l) => l.rank === actualLevel.rank + 1 && l.id !== actualLevel.id);
      appendLevelHistory(actualLevel, actualLevel.rank, {
        ru: `placed at #${actualLevel.rank}`,
        en: `placed at #${actualLevel.rank}`,
      }, {
        changeType: "added",
        aboveId: addedAbove ? addedAbove.id : null,
        aboveName: addedAbove ? addedAbove.name : null,
        belowId: addedBelow ? addedBelow.id : null,
        belowName: addedBelow ? addedBelow.name : null,
      });

      if (!store.siteSummary.spotlightLevelId) {
        store.siteSummary.spotlightLevelId = store.levels[0]?.id || "";
      }

      await writeStore(store);
      sendJson(res, 201, actualLevel);
      notifyLevelAdded(actualLevel, { aboveName: addedAbove?.name, belowName: addedBelow?.name }).catch(() => {});
    } catch (error) {
      badRequest(res, error.message);
    }
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/levels/")) {
    const levelId = pathname.replace("/api/levels/", "");
    const level = store.levels.find((entry) => entry.id === levelId);
    if (!level) { notFound(res, "Level not found"); return; }
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const enrichedLevel = {
      ...level,
      isNew: level.createdAt ? (now - new Date(level.createdAt).getTime()) < ONE_DAY : false,
      records: (level.records || []).map((r) => {
        if (r.userId) {
          const user = store.users.find((u) => u.id === r.userId);
          if (user) return { ...r, avatarUrl: user.avatarUrl || "", countryCode: user.countryCode || "" };
        }
        return r;
      }),
    };
    sendJsonPublic(res, enrichedLevel, 30);
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/levels/")) {
    const user = requireRole(store, req, res, ["moderator", "admin"]);
    if (!user) return;

    const levelId = pathname.replace("/api/levels/", "");
    const index = store.levels.findIndex((entry) => entry.id === levelId);
    if (index === -1) { notFound(res, "Level not found"); return; }

    try {
      const body = await getRequestBody(req);
      if (body.thumbnailData) {
        const uploaded = saveUploadedImage(body.thumbnailData);
        if (uploaded) body.thumbnailUrl = uploaded;
      }

      const previousRank = store.levels[index].rank;
      const level = sanitizeLevelInput(body, store.levels[index]);

      if (level.creatorId && !store.users.some((u) => u.id === level.creatorId)) {
        badRequest(res, "Creator not found among registered users");
        return;
      }
      if (level.verifierId && !store.users.some((u) => u.id === level.verifierId)) {
        badRequest(res, "Verifier not found among registered users");
        return;
      }

      if (level.rank !== previousRank) {
        if (level.rank < previousRank) {

          level.rank = level.rank - 0.5;
        } else {

          level.rank = level.rank + 0.5;
        }
      }

      store.levels[index] = level;
      normalizeLevelRanks(store);

      const actualLevel = store.levels.find((l) => l.id === level.id);
      if (previousRank !== actualLevel.rank) {
        const movedUp = actualLevel.rank < previousRank;
        const sortedLevels = [...store.levels].sort((a, b) => a.rank - b.rank);
        const movedAbove = sortedLevels.find((l) => l.rank === actualLevel.rank - 1 && l.id !== actualLevel.id);
        const movedBelow = sortedLevels.find((l) => l.rank === actualLevel.rank + 1 && l.id !== actualLevel.id);
        appendLevelHistory(actualLevel, actualLevel.rank, {
          ru: `#${previousRank} → #${actualLevel.rank}`,
          en: `#${previousRank} → #${actualLevel.rank}`,
        }, {
          changeType: movedUp ? "moved_up" : "moved_down",
          aboveId: movedAbove ? movedAbove.id : null,
          aboveName: movedAbove ? movedAbove.name : null,
          belowId: movedBelow ? movedBelow.id : null,
          belowName: movedBelow ? movedBelow.name : null,
        });
        notifyLevelMoved(actualLevel, previousRank, store.levels).catch(() => {});
      }

      await writeStore(store);
      sendJson(res, 200, actualLevel);
    } catch (error) {
      badRequest(res, error.message);
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/levels/") && !pathname.includes("/records/")) {
    const moderator = requireRole(store, req, res, ["moderator", "admin"]);
    if (!moderator) return;

    const levelId = decodeURIComponent(pathname.replace("/api/levels/", ""));
    const index = store.levels.findIndex((entry) => entry.id === levelId);
    if (index === -1) { notFound(res, "Level not found"); return; }

    const removedLevel = store.levels[index];
    store.levels.splice(index, 1);
    normalizeLevelRanks(store);
    await writeStore(store);
    sendJson(res, 200, { ok: true });
    notifyLevelRemoved(removedLevel).catch(() => {});
    return;
  }

  if (req.method === "DELETE" && /^\/api\/levels\/[^/]+\/records\/[^/]+$/.test(pathname)) {
    const moderator = requireRole(store, req, res, ["moderator", "admin"]);
    if (!moderator) return;

    const parts = pathname.split("/");
    const levelId = decodeURIComponent(parts[3]);
    const recordId = decodeURIComponent(parts[5]);

    const level = store.levels.find((entry) => entry.id === levelId);
    if (!level) { notFound(res, "Level not found"); return; }

    const recordIndex = (level.records || []).findIndex((r) => r.id === recordId);
    if (recordIndex === -1) { notFound(res, "Record not found"); return; }

    level.records.splice(recordIndex, 1);
    level.updatedAt = new Date().toISOString();

    await writeStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/leaderboards/players") {
    sendJsonPublic(res, buildPlayerLeaderboard(store, COUNTRY_BY_CODE), 30);
    return;
  }

  if (req.method === "GET" && pathname === "/api/leaderboards/countries") {
    sendJsonPublic(res, buildCountryLeaderboard(store, COUNTRY_BY_CODE), 30);
    return;
  }

  if (req.method === "GET" && pathname === "/api/rules") {
    sendJsonPublic(res, store.rules, 300);
    return;
  }

  if (req.method === "GET" && pathname === "/api/submissions") {
    const user = requireAuth(store, req, res);
    if (!user) return;

    const isMod = ["moderator", "admin"].includes(user.role);
    if (!isMod) {
      sendJson(res, 200, store.submissions.filter((item) => item.userId === user.id));
      return;
    }

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 15)));
    const search = String(url.searchParams.get("q") || "").trim().toLowerCase();
    const statusFilter = String(url.searchParams.get("status") || "");
    const typeFilter = String(url.searchParams.get("type") || "");
    const sortBy = String(url.searchParams.get("sort") || "date");
    const sortDir = String(url.searchParams.get("dir") || "desc");

    let filtered = [...store.submissions];
    if (search) {
      filtered = filtered.filter((s) =>
        (s.player || "").toLowerCase().includes(search) ||
        (s.levelName || "").toLowerCase().includes(search) ||
        s.id.toLowerCase().includes(search));
    }
    if (statusFilter && ["pending", "approved", "rejected", "banned"].includes(statusFilter)) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }
    if (typeFilter && ["record", "level"].includes(typeFilter)) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    const sortFn = {
      date: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      status: (a, b) => a.status.localeCompare(b.status),
      type: (a, b) => a.type.localeCompare(b.type),
      player: (a, b) => (a.player || "").localeCompare(b.player || ""),
    }[sortBy] || ((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

    filtered.sort(sortDir === "desc" ? (a, b) => sortFn(b, a) : sortFn);

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    sendJson(res, 200, { items, total, page, totalPages, limit });
    return;
  }

  if (req.method === "POST" && pathname === "/api/submissions") {
    const user = requireAuth(store, req, res);
    if (!user) return;
    try {
      const body = await getRequestBody(req);

      if (body.type === "level" && body.thumbnailData) {
        const uploaded = saveUploadedImage(body.thumbnailData);
        if (uploaded) body.previewImageUrl = uploaded;
      }
      const submission = sanitizeSubmissionInput(body, user, store);
      store.submissions.unshift(submission);
      await writeStore(store);
      sendJson(res, 201, submission);
    } catch (error) {
      badRequest(res, error.message);
    }
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/submissions/")) {
    const moderator = requireRole(store, req, res, ["moderator", "admin"]);
    if (!moderator) return;

    const submissionId = pathname.replace("/api/submissions/", "");
    const submission = store.submissions.find((entry) => entry.id === submissionId);
    if (!submission) { notFound(res, "Submission not found"); return; }

    try {
      const body = await getRequestBody(req);
      const action = String(body.action || "").trim();
      applySubmissionDecision(store, submission, action, moderator, String(body.moderationNote || ""));
      await writeStore(store);
      sendJson(res, 200, submission);
    } catch (error) {
      badRequest(res, error.message);
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/submissions/")) {
    const moderator = requireRole(store, req, res, ["moderator", "admin"]);
    if (!moderator) return;
    const submissionId = pathname.replace("/api/submissions/", "");
    const idx = store.submissions.findIndex((entry) => entry.id === submissionId);
    if (idx === -1) { notFound(res, "Submission not found"); return; }
    store.submissions.splice(idx, 1);
    await writeStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/v1/levels") {
    sendJson(res, 200, store.levels.map((l) => ({
      id: l.id, rank: l.rank, name: l.name, creator: l.creator, verifier: l.verifier,
      originalName: l.originalName, segment: l.segment, score100: l.score100,
      minProgress: l.minProgress, minProgressScore: l.minProgressScore,
      nerfedLevelId: l.nerfedLevelId, originalLevelId: l.originalLevelId,
      recordsCount: (l.records || []).length,
    })).sort((a, b) => a.rank - b.rank));
    return;
  }

  if (req.method === "GET" && pathname === "/api/v1/players") {
    const lb = buildPlayerLeaderboard(store, COUNTRY_BY_CODE);
    sendJson(res, 200, lb.map((p) => ({
      rank: p.rank, nickname: p.nickname, countryCode: p.countryCode,
      score: p.score, completions: p.completions, hardest: p.hardest,
    })));
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/v1/levels/") && pathname.endsWith("/records")) {
    const levelId = pathname.replace("/api/v1/levels/", "").replace("/records", "");
    const level = store.levels.find((l) => l.id === levelId);
    if (!level) { notFound(res, "Level not found"); return; }
    sendJson(res, 200, (level.records || []).map((r) => ({
      player: r.player, progress: r.progress, videoUrl: r.videoUrl, date: r.date,
    })));
    return;
  }

  if (req.method === "GET" && pathname === "/api/users/search") {
    const user = requireRole(store, req, res, ["moderator", "admin"]);
    if (!user) return;
    const query = String(url.searchParams.get("q") || "").trim().toLowerCase();
    const results = store.users
      .filter((u) => !u.isBanned && u.nickname.toLowerCase().includes(query))
      .slice(0, 20)
      .map((u) => sanitizeUserForClient(u, COUNTRY_BY_CODE));
    sendJson(res, 200, results);
    return;
  }

  if (req.method === "GET" && pathname === "/api/users") {
    const user = requireRole(store, req, res, ["moderator", "admin"]);
    if (!user) return;
    const includeEmail = user.role === "admin";

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const search = String(url.searchParams.get("q") || "").trim().toLowerCase();
    const sortBy = String(url.searchParams.get("sort") || "nickname");
    const sortDir = String(url.searchParams.get("dir") || "asc");

    let filtered = [...store.users];
    if (search) {
      filtered = filtered.filter((u) =>
        u.nickname.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search));
    }

    const sortFn = {
      nickname: (a, b) => a.nickname.localeCompare(b.nickname),
      role: (a, b) => a.role.localeCompare(b.role),
      created: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      country: (a, b) => (a.countryCode || "").localeCompare(b.countryCode || ""),
    }[sortBy] || ((a, b) => a.nickname.localeCompare(b.nickname));

    filtered.sort(sortDir === "desc" ? (a, b) => sortFn(b, a) : sortFn);

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit).map((u) =>
      sanitizeUserForClient(u, COUNTRY_BY_CODE, { includeEmail }));

    sendJson(res, 200, { items, total, page, totalPages, limit });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/users/")) {
    const userId = pathname.replace("/api/users/", "");
    if (userId.includes("/")) { notFound(res, "API route not found"); return; }

    const target = store.users.find((u) => u.id === userId || u.nickname.toLowerCase() === userId.toLowerCase());
    if (!target) { notFound(res, "User not found"); return; }

    const requestingUser = getUserFromRequest(store, req);
    const isSelfOrAdmin = requestingUser && (requestingUser.id === target.id || requestingUser.role === "admin");
    const profile = sanitizeUserForClient(target, COUNTRY_BY_CODE, { includeEmail: isSelfOrAdmin });

    const playerRecords = [];
    const verifiedLevels = [];
    const createdLevels = [];
    let totalScore = 0;
    let completions = 0;
    let hardest = null;
    const bestScoreByLevel = new Map();

    for (const level of store.levels) {
      if (level.creatorId === target.id || level.creator.toLowerCase() === target.nickname.toLowerCase()) {
        createdLevels.push({ id: level.id, name: level.name, rank: level.rank });
      }
      if (level.verifierId === target.id || level.verifier.toLowerCase() === target.nickname.toLowerCase()) {
        verifiedLevels.push({ id: level.id, name: level.name, rank: level.rank });
      }
      for (const record of level.records || []) {
        if (record.userId === target.id) {
          const progress = Number.parseFloat(String(record.progress || "").replace("%", "")) || 0;
          const pts = recordScore(level, record);
          const existingBest = bestScoreByLevel.get(level.id);
          if (!existingBest || pts > existingBest.pts) bestScoreByLevel.set(level.id, { pts, progress });
          if (!hardest || level.rank < hardest.rank) hardest = { name: level.name, rank: level.rank, id: level.id };
          playerRecords.push({
            levelId: level.id, levelName: level.name, levelRank: level.rank,
            progress: record.progress, videoUrl: record.videoUrl, date: record.date,
          });
        }
      }
    }

    for (const { pts, progress } of bestScoreByLevel.values()) {
      totalScore += pts;
      if (progress >= 100) completions++;
    }
    for (const vl of verifiedLevels) {
      const lvl = store.levels.find((l) => l.id === vl.id);
      if (lvl) {
        totalScore += Number(lvl.score100 || 0);
        if (!hardest || lvl.rank < hardest.rank) hardest = { name: lvl.name, rank: lvl.rank, id: lvl.id };
      }
    }

    sendJson(res, 200, {
      ...profile,
      score: Number(totalScore.toFixed(2)),
      completions,
      hardest: hardest ? hardest.name : "-",
      hardestId: hardest ? hardest.id : null,
      hardestRank: hardest ? hardest.rank : 9999,
      records: playerRecords,
      verifiedLevels,
      createdLevels,
    });
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/users/")) {
    const moderator = requireRole(store, req, res, ["moderator", "admin"]);
    if (!moderator) return;

    const userId = pathname.replace("/api/users/", "");
    const target = store.users.find((user) => user.id === userId);
    if (!target) { notFound(res, "User not found"); return; }

    try {
      const body = await getRequestBody(req);

      if (body.role && ["player", "moderator", "admin"].includes(String(body.role))) {
        if (moderator.role !== "admin") {
          forbidden(res, "Only admins can change roles");
          return;
        }
        target.role = String(body.role);
      }

      if (body.isBanned !== undefined) {
        target.isBanned = Boolean(body.isBanned);
      }

      target.updatedAt = new Date().toISOString();
      await writeStore(store);
      sendJson(res, 200, {
        user: sanitizeUserForClient(target, COUNTRY_BY_CODE, { includeEmail: moderator.role === "admin" }),
      });
    } catch (error) {
      badRequest(res, error.message);
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/users/")) {
    const admin = requireRole(store, req, res, ["admin"]);
    if (!admin) return;

    const userId = decodeURIComponent(pathname.replace("/api/users/", ""));
    const index = store.users.findIndex((u) => u.id === userId);
    if (index === -1) { notFound(res, "User not found"); return; }

    const target = store.users[index];
    if (target.role === "admin") { forbidden(res, "Cannot delete admin account"); return; }

    store.sessions = store.sessions.filter((s) => s.userId !== userId);

    for (const level of store.levels) {
      if (Array.isArray(level.records)) {
        level.records = level.records.filter((r) => r.userId !== userId);
      }
    }

    store.submissions = store.submissions.filter((s) => s.userId !== userId);

    store.users.splice(index, 1);
    await writeStore(store);
    sendJson(res, 200, { ok: true });
    return;
  }

  notFound(res, "API route not found");
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

async function startServer() {
  console.log("Initializing database...");
  await initStore();

  const _store = readStore();
  const { parseYouTubeId } = require("./server/utils");
  for (const level of _store.levels) {
    if (level.thumbnailUrl && parseYouTubeId(level.thumbnailUrl)) {
      const ytId = level.youtubeId || parseYouTubeId(level.verificationUrl);
      if (ytId) level.thumbnailUrl = `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`;
    }
  }

  for (const level of _store.levels) {
    for (const record of level.records || []) {
      if (record.progress && /^\d+(?:\.\d+)?$/.test(String(record.progress).trim())) {
        record.progress = String(record.progress).trim() + "%";
      }
    }
  }
  normalizeLevelRanks(_store);
  await writeStore(_store);

  const server = http.createServer(async (req, res) => {
    setSecurityHeaders(res);

    try {

      if (req.url.startsWith("/api/")) {
        await handleApi(req, res);
        return;
      }

      if (!["GET", "HEAD"].includes(req.method)) {
        methodNotAllowed(res, ["GET", "HEAD"]);
        return;
      }

      const lowerUrl = req.url.toLowerCase().split("?")[0];
      if (
        lowerUrl.startsWith("/data/") ||
        lowerUrl.startsWith("/server/") ||
        lowerUrl.startsWith("/.") ||
        lowerUrl === "/package.json" ||
        lowerUrl === "/package-lock.json" ||
        lowerUrl === "/deploy.py" ||
        lowerUrl === "/server.js" ||
        (lowerUrl.endsWith(".json") && !lowerUrl.startsWith("/uploads/"))
      ) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }

      const url = new URL(req.url, `http://${HOST}:${PORT}`);
      const pathname = url.pathname;

      if (pathname.endsWith(".html")) {
        const clean = pathname === "/index.html" ? "/" : pathname.replace(/\.html$/, "");
        res.writeHead(301, { Location: clean + (url.search || "") });
        res.end();
        return;
      }

      const cleanPath = pathname.replace(/^\//, "");
      if (CLEAN_PAGES.has(cleanPath)) {
        req.url = `/${cleanPath}.html${url.search || ""}`;
      }

      serveStatic(req, res);
    } catch (error) {
      sendJson(res, 500, { error: "Internal server error" });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`NDL server is running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
