const http = require("http");
const fs = require("fs");
const path = require("path");

const PRESET_ENV_KEYS = new Set(Object.keys(process.env));
const LOOSE_ENV_KEYS = new Set([
  "A2E_API_BASE",
  "A2E_API_KEY",
  "NANO_BANANA_API_BASE",
  "NANO_BANANA_API_KEY",
  "GOOGLE_API_KEY",
  "ALLOWED_ORIGINS",
  "PORT",
  "MAX_BODY_BYTES",
]);

const DEFAULT_NANO_BASE = "https://gateway.bananapro.site";

function setEnvValue(key, value, { override = false } = {}) {
  if (!value) {
    return;
  }
  if (!process.env[key] || (override && !PRESET_ENV_KEYS.has(key))) {
    process.env[key] = value;
  }
}

function loadEnvFile(envPath, { override = false } = {}) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    setEnvValue(key, value, { override });
  });
}

function refreshRuntimeEnv() {
  loadEnvFile(path.join(__dirname, ".env"));
  loadEnvFile(path.join(__dirname, "secure-keys", ".env"), { override: true });
  loadLooseEnvFile(path.join(__dirname, "secure-keys", "api-key.txt"), { override: true });
  loadLooseEnvFile(path.join(__dirname, "apikeys.env", "api-key.txt"), { override: true });
}

function loadLooseEnvFile(filePath, { override = false } = {}) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const rawTokens = [];

  lines.forEach((entry) => {
    const trimmed = entry.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      rawTokens.push(trimmed);
      return;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!LOOSE_ENV_KEYS.has(key)) {
      return;
    }
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    setEnvValue(key, value, { override });
  });

  if (rawTokens.length > 0) {
    setEnvValue("A2E_API_KEY", rawTokens[0], { override });
    setEnvValue("NANO_BANANA_API_KEY", rawTokens[0], { override });
  }
}

refreshRuntimeEnv();

const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 20_000_000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const ALLOWED_API_PATHS = new Set([
  "/v1/nano-banana-pro/images",
  "/v1/a2e/images",
  "/v1/a2e/videos",
  "/v1/gemini/images",
]);

const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function isOriginAllowed(req) {
  const origin = req.headers.origin;

  if (ALLOWED_ORIGINS.length > 0) {
    return origin ? ALLOWED_ORIGINS.includes(origin) : false;
  }

  if (!origin) {
    return true;
  }

  const host = req.headers.host;
  if (!host) {
    return false;
  }

  return origin === `http://${host}` || origin === `https://${host}`;
}

function setCorsHeaders(res, origin) {
  const allowOrigin = origin || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Payload too large"));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) {
    return null;
  }
  return targetPath;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonSafe(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeResolution(width, height) {
  const maxDim = Math.max(Number(width) || 0, Number(height) || 0);
  if (maxDim >= 3500) {
    return "4K";
  }
  if (maxDim >= 1700) {
    return "2K";
  }
  return "1K";
}

async function pollNanoResult(taskId, { base, key, timeoutMs = 45000, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastPayload = null;

  while (Date.now() < deadline) {
    const pollUrl = new URL(`/api/v1/images/${taskId}`, base).toString();
    const pollResponse = await fetch(pollUrl, {
      headers: {
        "Authorization": `Bearer ${key}`,
      },
    });

    const text = await pollResponse.text();
    const payload = parseJsonSafe(text);
    lastPayload = payload || text;

    if (!pollResponse.ok) {
      throw new Error(`Nano Banana status error ${pollResponse.status}: ${text || pollResponse.statusText}`);
    }

    const status = payload?.data?.status || payload?.status;
    if (status === "completed" || status === "succeeded" || status === "success") {
      return payload;
    }
    if (status === "failed" || status === "error") {
      throw new Error(payload?.data?.error || "Nano Banana task failed.");
    }

    await delay(intervalMs);
  }

  throw new Error(
    `Nano Banana task ${taskId} is still processing. Last response: ${JSON.stringify(lastPayload)}`
  );
}

async function handleNanoBananaProxy(res, url, body, { base, key }) {
  const payload = parseJsonSafe(body) || {};
  const prompt = payload.prompt || payload.text || "";
  const aspect =
    payload.aspect_ratio ||
    payload.aspectRatio ||
    payload.output?.aspect_ratio ||
    payload.output?.aspectRatio ||
    "1:1";
  const width = payload.width || payload.output?.width;
  const height = payload.height || payload.output?.height;
  const resolution = normalizeResolution(width, height);
  const model = payload.model || "nano-banana-pro";

  const generatePayload = {
    model,
    prompt,
    aspect_ratio: aspect,
    resolution,
  };

  const generateUrl = new URL("/api/v1/images/generate", base).toString();
  const generateResponse = await fetch(generateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(generatePayload),
  });

  const generateText = await generateResponse.text();
  const generateJson = parseJsonSafe(generateText);

  if (!generateResponse.ok) {
    const rawMsg = generateJson?.error?.message || generateText || generateResponse.statusText;
    const errMsg = scrubSecrets(rawMsg);
    sendJson(res, generateResponse.status === 401 ? 401 : 502, {
      error: `Nano Banana error ${generateResponse.status}: ${errMsg}`,
    });
    return;
  }

  const taskId = generateJson?.data?.task_id || generateJson?.task_id;
  if (!taskId) {
    sendJson(res, 502, { error: "Nano Banana response did not include a task_id." });
    return;
  }

  let finalPayload = null;
  try {
    finalPayload = await pollNanoResult(taskId, { base, key });
  } catch (error) {
    sendJson(res, 502, { error: error.message || "Nano Banana task polling failed." });
    return;
  }

  const data = finalPayload?.data || finalPayload || {};
  const imageUrls = [];

  if (Array.isArray(data?.results)) {
    data.results.forEach((item) => {
      if (item?.url) {
        imageUrls.push(item.url);
      }
      if (item?.image_url) {
        imageUrls.push(item.image_url);
      }
    });
  }

  if (data?.image_url) {
    imageUrls.push(data.image_url);
  }
  if (data?.url) {
    imageUrls.push(data.url);
  }

  const outputs = imageUrls.filter(Boolean).map((urlValue) => ({ url: urlValue }));

  if (!outputs.length) {
    sendJson(res, 502, { error: "Nano Banana completed without an image URL." });
    return;
  }

  sendJson(res, 200, { data: outputs });
}

const GOOGLE_IMAGEN_BASE = "https://generativelanguage.googleapis.com";
const GOOGLE_IMAGEN_MODEL = "imagen-4.0-generate-001";

const IMAGEN_ASPECT_RATIOS = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);

function mapAspectRatio(ratio) {
  if (IMAGEN_ASPECT_RATIOS.has(ratio)) {
    return ratio;
  }
  const map = { "4:5": "3:4", "5:4": "4:3", "3:2": "4:3", "2:3": "3:4" };
  return map[ratio] || "1:1";
}

async function handleGeminiProxy(res, url, body) {
  const googleKey = process.env.GOOGLE_API_KEY || "";
  if (!googleKey) {
    sendJson(res, 500, { error: "Missing GOOGLE_API_KEY environment variable." });
    return;
  }

  const payload = parseJsonSafe(body) || {};
  const prompt = payload.prompt || payload.text || "";
  if (!prompt) {
    sendJson(res, 400, { error: "Prompt is required." });
    return;
  }

  const rawAspect =
    payload.aspect_ratio ||
    payload.aspectRatio ||
    payload.output?.aspect_ratio ||
    "1:1";
  const aspect = mapAspectRatio(rawAspect);
  const count = Math.min(Math.max(Number(payload.count) || 1, 1), 4);

  const googleUrl = `${GOOGLE_IMAGEN_BASE}/v1beta/models/${GOOGLE_IMAGEN_MODEL}:predict?key=${encodeURIComponent(googleKey)}`;

  const googlePayload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: count,
      aspectRatio: aspect,
      safetyFilterLevel: "BLOCK_ONLY_HIGH",
      personGeneration: "ALLOW_ALL",
    },
  };

  const googleResponse = await fetch(googleUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(googlePayload),
  });

  const responseText = await googleResponse.text();
  const responseJson = parseJsonSafe(responseText);

  if (!googleResponse.ok) {
    const rawMsg = responseJson?.error?.message || responseText || googleResponse.statusText;
    const msg = scrubSecrets(rawMsg);
    sendJson(res, googleResponse.status === 403 ? 403 : 502, {
      error: `Gemini API error ${googleResponse.status}: ${msg}`,
    });
    return;
  }

  const predictions = responseJson?.predictions || [];
  const outputs = predictions
    .filter((p) => p?.bytesBase64Encoded)
    .map((p) => ({
      url: `data:${p.mimeType || "image/png"};base64,${p.bytesBase64Encoded}`,
    }));

  if (!outputs.length) {
    sendJson(res, 502, { error: "Gemini API returned no images." });
    return;
  }

  sendJson(res, 200, { data: outputs });
}

async function handleApiProxy(req, res, url) {
  refreshRuntimeEnv();

  setCorsHeaders(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Allow": "POST" });
    res.end("Method Not Allowed");
    return;
  }

  if (!isOriginAllowed(req)) {
    sendJson(res, 403, { error: "Origin not allowed." });
    return;
  }

  const upstreamPath = url.pathname.replace(/^\/api/, "");
  if (!ALLOWED_API_PATHS.has(upstreamPath)) {
    sendJson(res, 403, { error: "Endpoint not allowed." });
    return;
  }

  let body = "";
  try {
    body = await readRequestBody(req);
  } catch (error) {
    if (error.message === "Payload too large") {
      sendJson(res, 413, { error: "Payload too large." });
      return;
    }
    throw error;
  }
  const a2eBase = process.env.A2E_API_BASE || "";
  const a2eKey = process.env.A2E_API_KEY || "";
  const nanoBase = process.env.NANO_BANANA_API_BASE || DEFAULT_NANO_BASE;
  const nanoKey = process.env.NANO_BANANA_API_KEY || "";
  const useNano = upstreamPath === "/v1/nano-banana-pro/images";
  const upstreamBase = useNano ? (nanoBase || a2eBase) : a2eBase;
  const upstreamKey = useNano ? (nanoKey || a2eKey) : a2eKey;
  const baseLabel = useNano && nanoBase ? "NANO_BANANA_API_BASE" : "A2E_API_BASE";
  const keyLabel = useNano && nanoKey ? "NANO_BANANA_API_KEY" : "A2E_API_KEY";

  const hasGoogleKey = Boolean(process.env.GOOGLE_API_KEY);
  const isGeminiRoute = upstreamPath === "/v1/gemini/images" ||
    upstreamPath === "/v1/nano-banana-pro/images";

  if (isGeminiRoute && hasGoogleKey) {
    await handleGeminiProxy(res, url, body);
    return;
  }

  if (!upstreamBase || !upstreamKey) {
    sendJson(res, 500, {
      error: `Missing ${baseLabel} or ${keyLabel} environment variables.`,
    });
    return;
  }

  if (useNano) {
    await handleNanoBananaProxy(res, url, body, {
      base: upstreamBase,
      key: upstreamKey,
    });
    return;
  }

  const upstreamUrl = new URL(upstreamPath, upstreamBase);
  upstreamUrl.search = url.search;

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${upstreamKey}`,
    },
    body,
  });

  const responseBody = await upstreamResponse.text();
  const contentType = upstreamResponse.headers.get("content-type") || "application/json";

  // If upstream returned HTML instead of JSON, send a proper JSON error
  if (contentType.includes("text/html") || responseBody.trimStart().startsWith("<!")) {
    const status = upstreamResponse.ok ? 502 : upstreamResponse.status;
    sendJson(res, status, {
      error: `API returned an unexpected HTML response (${upstreamResponse.status}). The endpoint may be unavailable.`,
    });
    return;
  }

  res.writeHead(upstreamResponse.status, { "Content-Type": contentType });
  res.end(responseBody);
}

function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = safeJoin(PUBLIC_DIR, requestPath);

  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

function scrubSecrets(text) {
  if (!text || typeof text !== "string") {
    return text;
  }
  const keys = [
    process.env.A2E_API_KEY,
    process.env.NANO_BANANA_API_KEY,
    process.env.GOOGLE_API_KEY,
  ].filter(Boolean);
  let scrubbed = text;
  for (const key of keys) {
    if (key.length > 8 && scrubbed.includes(key)) {
      scrubbed = scrubbed.split(key).join("[REDACTED]");
    }
  }
  return scrubbed;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApiProxy(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    const safeMessage = scrubSecrets(error?.message || "Server error");
    console.error("Request error:", safeMessage);
    sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`CAMERA IRIS server running on http://localhost:${PORT}`);
});
