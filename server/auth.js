const {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} = require("crypto");
const { pool } = require("./db");

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const expected = Buffer.from(user.passwordHash, "hex");
  const actual = scryptSync(password, user.passwordSalt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

function generateBase32Secret(length = 32) {
  let secret = "";
  for (let index = 0; index < length; index += 1) {
    secret += BASE32_ALPHABET[Math.floor(Math.random() * BASE32_ALPHABET.length)];
  }
  return secret;
}

function base32ToBuffer(secret) {
  let bits = "";
  const cleanSecret = String(secret || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");

  for (const character of cleanSecret) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value >= 0) {
      bits += value.toString(2).padStart(5, "0");
    }
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", base32ToBuffer(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1000000).padStart(6, "0");
}

function verifyTotp(secret, code, windowSize = 1) {
  const normalizedCode = String(code || "").trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    const timestamp = Date.now() + offset * 30000;
    if (generateTotp(secret, timestamp) === normalizedCode) {
      return true;
    }
  }

  return false;
}

function generateRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => randomBytes(4).toString("hex").toUpperCase());
}

async function createSession(store, userId) {
  cleanExpiredSessions(store);
  const token = generateSessionToken();
  const session = {
    id: randomUUID(),
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
  store.sessions.push(session);
  try {
    await pool.query(
      `INSERT INTO sessions (id, token, user_id, expires_at) VALUES ($1, $2, $3, $4)`,
      [session.id, session.token, session.userId, session.expiresAt],
    );
    pool.query(`DELETE FROM sessions WHERE expires_at <= NOW()`).catch(() => {});
  } catch (err) {
    console.error("createSession DB error:", err.message);
  }
  return token;
}

function cleanExpiredSessions(store) {
  const now = Date.now();
  store.sessions = (store.sessions || []).filter(
    (session) => session.expiresAt && Date.parse(session.expiresAt) > now,
  );
}

function getTokenFromRequest(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7).trim() || null;
}

function getSessionFromRequest(store, req) {
  cleanExpiredSessions(store);
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }
  return store.sessions.find((session) => session.token === token) || null;
}

function getUserFromRequest(store, req) {
  const session = getSessionFromRequest(store, req);
  if (!session) {
    return null;
  }
  return store.users.find((user) => user.id === session.userId) || null;
}

async function revokeSession(store, token) {
  store.sessions = (store.sessions || []).filter((session) => session.token !== token);
  try {
    await pool.query(`DELETE FROM sessions WHERE token = $1`, [token]);
  } catch (err) {
    console.error("revokeSession DB error:", err.message);
  }
}

module.exports = {
  createSession,
  generateBase32Secret,
  generateRecoveryCodes,
  generateTotp,
  getSessionFromRequest,
  getTokenFromRequest,
  getUserFromRequest,
  hashPassword,
  revokeSession,
  verifyPassword,
  verifyTotp,
};
