const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const IMAGE_EXTENSIONS = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendJsonPublic(res, payload, maxAge = 30) {
  res.writeHead(200, {
    "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=120`,
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function notFound(res, message = "Not found") {
  sendJson(res, 404, { error: message });
}

function badRequest(res, message) {
  sendJson(res, 400, { error: message });
}

function unauthorized(res, message = "Unauthorized") {
  sendJson(res, 401, { error: message });
}

function forbidden(res, message = "Forbidden") {
  sendJson(res, 403, { error: message });
}

function methodNotAllowed(res, methods) {
  res.writeHead(405, { Allow: methods.join(", ") });
  res.end();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseYouTubeId(url) {
  const value = String(url || "");
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function isGoogleDriveLink(value) {
  return /drive\.google\.com|docs\.google\.com/i.test(String(value || ""));
}

function getRequestBody(req, maxSize = 1024 * 1024 * 10) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxSize) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function saveUploadedImage(base64Data) {
  if (!base64Data || typeof base64Data !== "string") {
    return null;
  }

  const match = base64Data.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const data = match[2];
  const ext = IMAGE_EXTENSIONS[mimeType];
  if (!ext) {
    return null;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const filename = `${randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));

  return `/uploads/${filename}`;
}

function getStaticFilePath(requestPath) {
  const pathname = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return filePath;
}

function serveStatic(req, res) {
  if (!fs.existsSync(PUBLIC_DIR)) {
    sendText(res, 503, "Public directory is not ready yet");
    return;
  }

  const filePath = getStaticFilePath(req.url);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Static file not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  const headers = {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  };
  if (filePath.startsWith(UPLOADS_DIR)) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else if (req.url.includes("?v=") && (ext === ".css" || ext === ".js")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else if (ext === ".css" || ext === ".js") {
    headers["Cache-Control"] = "public, max-age=3600";
  } else if (ext === ".svg" || ext === ".png" || ext === ".ico" || ext === ".webp") {
    headers["Cache-Control"] = "public, max-age=86400";
  }

  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

module.exports = {
  badRequest,
  forbidden,
  getRequestBody,
  isGoogleDriveLink,
  methodNotAllowed,
  sendJsonPublic,
  notFound,
  parseYouTubeId,
  saveUploadedImage,
  sendJson,
  serveStatic,
  slugify,
  unauthorized,
};
