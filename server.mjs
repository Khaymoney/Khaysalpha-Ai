import http from "http";
import https from "https";
import { URL } from "url";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac, randomBytes, pbkdf2Sync } from "crypto";
import { Pool } from "pg";
import busboy from "busboy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 5000;
const AI_KEY = process.env.GEMINI_API_KEY;
const AI_BASE = "generativelanguage.googleapis.com";
const CAPX_CONTRACT = "0x71fb1795b084ff2b65eabf51cad22bbefd42ed5f";

// ─── Startup Validation ─────────────────────────────────────────────────────
function validateEnvironment() {
  const errors = [];
  if (!process.env.GEMINI_API_KEY) {
    errors.push("❌ GEMINI_API_KEY not set. AI responses will fail.");
  }
  if (!process.env.DATABASE_URL) {
    errors.push("❌ DATABASE_URL not set. Database connection will fail.");
  }
  if (errors.length > 0) {
    console.error("⚠️  Configuration Issues:");
    errors.forEach(e => console.error("  " + e));
    console.error("\n📝 To fix:");
    console.error("  1. Create/edit .env file in project root");
    console.error("  2. Add: GEMINI_API_KEY=your_key_from_ai.google.dev");
    console.error("  3. Add: DATABASE_URL=postgresql://user:pass@host/db");
    console.error("  4. Restart: npm start\n");
  } else {
    console.log("✅ Environment variables configured");
    console.log(`   ✓ GEMINI_API_KEY: ${AI_KEY.substring(0, 10)}...`);
    console.log(`   ✓ DATABASE_URL: Connected`);
  }
  return errors.length === 0;
}

// ─── Database ────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        image_data TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ Database ready");
  } finally {
    client.release();
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const h = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return h === hash;
}
function generateToken() {
  return randomBytes(40).toString("hex");
}

async function getUser(token) {
  if (!token) return null;
  const r = await pool.query(
    "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > NOW()",
    [token]
  );
  return r.rows[0] || null;
}

function getToken(req) {
  const auth = req.headers["authorization"] || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// ─── AI API ───────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are KhaysAlpha AI — a brilliant, versatile assistant built for research and decision-making.
You can answer ANY question on any topic: cryptocurrency & markets, science, history, relationships, love, emotions, travel, food, technology, celebrities, movies, music, sports, world events, the universe, education, health, entertainment, and more.
Be warm, knowledgeable, thorough and direct. Format responses with markdown when helpful.
For crypto/market questions, provide insightful analysis. For personal questions, be empathetic and thoughtful.
Never refuse reasonable questions — handle mature topics with maturity and respect.
You represent KhaysAlpha AI — Research Faster. Decide Smarter.`;

function aiStream(messages, onChunk, onDone, onError) {
  // Check if API key is configured
  if (!AI_KEY) {
    return onError(new Error("GEMINI_API_KEY not configured. Set it in .env file and restart the server."));
  }

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
  });

  const options = {
    hostname: AI_BASE,
    path: `/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${AI_KEY}`,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  };

  const req = https.request(options, (res) => {
    let buffer = "";
    let finished = false;

    // Check for API errors
    if (res.statusCode !== 200) {
      let errorData = "";
      res.on("data", (chunk) => errorData += chunk);
      res.on("end", () => {
        try {
          const error = JSON.parse(errorData);
          if (error.error?.message?.includes("API_KEY_INVALID")) {
            onError(new Error("❌ Invalid GEMINI_API_KEY. Check your .env file at https://ai.google.dev/"));
          } else if (error.error?.message?.includes("QUOTA")) {
            onError(new Error("❌ API quota exceeded. Check https://ai.google.dev/"));
          } else {
            onError(new Error(`API Error: ${error.error?.message || errorData}`));
          }
        } catch {
          onError(new Error(`API Error (${res.statusCode}): ${errorData.slice(0, 200)}`));
        }
      });
      return;
    }

    res.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const json = JSON.parse(raw);
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
          const reason = json.candidates?.[0]?.finishReason;
          if (reason && reason !== "STOP" && reason !== "") {
            if (!finished) { finished = true; onDone(); }
          }
        } catch {}
      }
    });
    res.on("end", () => { if (!finished) { finished = true; onDone(); } });
    res.on("error", onError);
  });
  req.on("error", onError);
  req.write(body);
  req.end();
}

async function generateImage(prompt) {
  // Try Imagen 3 first
  try {
    const result = await tryImagen3(prompt);
    if (result) return result;
  } catch (e) {
    console.log("Imagen3 failed, trying Gemini flash:", e.message);
  }
  // Fallback to Gemini 2.0 Flash image generation
  return await tryGeminiImageGen(prompt);
}

function tryImagen3(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", safetyFilterLevel: "block_few" },
    });
    const opts = {
      hostname: AI_BASE,
      path: `/v1beta/models/imagen-3.0-generate-002:predict?key=${AI_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          const pred = json.predictions?.[0];
          if (pred?.bytesBase64Encoded) {
            resolve(`data:${pred.mimeType || "image/png"};base64,${pred.bytesBase64Encoded}`);
          } else {
            reject(new Error("No image in response"));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function tryGeminiImageGen(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `Create a high quality, detailed image: ${prompt}` }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 1 },
    });
    const opts = {
      hostname: AI_BASE,
      path: `/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${AI_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message || JSON.stringify(json.error))); return; }
          const parts = json.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              resolve(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
              return;
            }
          }
          reject(new Error("No image data returned. The AI model may not support image generation with this API key."));
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function analyzeImage(base64, mimeType, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: prompt || "Describe and analyze this image in detail." },
        ],
      }],
    });
    const opts = {
      hostname: AI_BASE,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${AI_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) { reject(new Error(json.error.message)); return; }
          resolve(json.candidates?.[0]?.content?.parts?.[0]?.text || "Could not analyze image.");
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── Market Data ─────────────────────────────────────────────────────────────
const KNOWN_IDS = "bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,shiba-inu,avalanche-2,polkadot,chainlink,polygon,tron,litecoin,uniswap";
let capxCoinId = null;

function geckoGet(path) {
  return new Promise((resolve) => {
    https.get({
      hostname: "api.coingecko.com", path,
      headers: { Accept: "application/json", "User-Agent": "KhaysAlphaAI/1.0" },
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on("error", () => resolve(null));
  });
}

async function fetchCapxId() {
  // Try contract on multiple chains
  const chains = ["ethereum", "binance-smart-chain", "polygon-pos", "arbitrum-one", "base"];
  for (const chain of chains) {
    const json = await geckoGet(`/api/v3/coins/${chain}/contract/${CAPX_CONTRACT}`);
    if (json?.id) { capxCoinId = json.id; console.log(`✅ CAPX found on ${chain}: ${json.id}`); return json.id; }
  }
  // Fallback: search by name
  const search = await geckoGet(`/api/v3/search?query=capx`);
  if (search?.coins?.length) {
    const match = search.coins.find(c => c.symbol?.toLowerCase() === "capx");
    if (match?.id) { capxCoinId = match.id; console.log(`✅ CAPX found via search: ${match.id}`); return match.id; }
  }
  console.log("ℹ️  CAPX not yet on CoinGecko — will show when listed");
  return null;
}

async function fetchMarket() {
  if (!capxCoinId) await fetchCapxId();
  const ids = KNOWN_IDS + (capxCoinId ? `,${capxCoinId}` : "");
  return new Promise((resolve) => {
    const opts = {
      hostname: "api.coingecko.com",
      path: `/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`,
      headers: { Accept: "application/json", "User-Agent": "KhaysAlphaAI/1.0" },
    };
    https.get(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
    }).on("error", () => resolve([]));
  });
}

async function fetchGlobal() {
  return new Promise((resolve) => {
    https.get({
      hostname: "api.coingecko.com",
      path: "/api/v3/global",
      headers: { Accept: "application/json", "User-Agent": "KhaysAlphaAI/1.0" },
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d).data || {}); } catch { resolve({}); } });
    }).on("error", () => resolve({}));
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers, limits: { fileSize: 20 * 1024 * 1024 } });
    const fields = {};
    let fileBuffer = null;
    let fileMime = "image/jpeg";
    bb.on("field", (name, val) => (fields[name] = val));
    bb.on("file", (_field, stream, info) => {
      fileMime = info.mimeType;
      const chunks = [];
      stream.on("data", (c) => chunks.push(c));
      stream.on("end", () => (fileBuffer = Buffer.concat(chunks)));
    });
    bb.on("finish", () => resolve({ fields, fileBuffer, fileMime }));
    bb.on("error", reject);
    req.pipe(bb);
  });
}

function serveFrontend(req, res) {
  const urlPath = req.url.split("?")[0];
  const htmlRoutes = ["/", "/chat", "/market", "/image", "/history", "/login", "/register"];
  const isChatRoute = urlPath.startsWith("/chat/");
  const isHtmlRoute = htmlRoutes.includes(urlPath) || isChatRoute;

  const filePath = isHtmlRoute
    ? path.join(__dirname, "public", "index.html")
    : path.join(__dirname, "public", urlPath);

  const ext = path.extname(filePath).toLowerCase();
  const mimes = {
    ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, "public", "index.html"), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": mimes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

// ─── Request Handler ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    // ── Auth routes
    if (method === "POST" && pathname === "/api/auth/register") {
      const { username, email, password } = await parseBody(req);
      if (!username?.trim() || !email?.trim() || !password?.trim())
        return json(res, 400, { error: "Username, email, and password are required" });
      if (password.length < 6)
        return json(res, 400, { error: "Password must be at least 6 characters" });
      try {
        const hash = hashPassword(password);
        const r = await pool.query(
          "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
          [username.trim().toLowerCase(), email.trim().toLowerCase(), hash]
        );
        const user = r.rows[0];
        const token = generateToken();
        await pool.query(
          "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
          [token, user.id]
        );
        return json(res, 201, { token, user: { id: user.id, username: user.username, email: user.email } });
      } catch (e) {
        if (e.code === "23505") {
          const field = e.constraint?.includes("email") ? "email" : "username";
          return json(res, 409, { error: `That ${field} is already taken` });
        }
        throw e;
      }
    }

    if (method === "POST" && pathname === "/api/auth/login") {
      const { email, password } = await parseBody(req);
      if (!email?.trim() || !password?.trim())
        return json(res, 400, { error: "Email and password are required" });
      const r = await pool.query("SELECT * FROM users WHERE email = $1", [email.trim().toLowerCase()]);
      const user = r.rows[0];
      if (!user || !verifyPassword(password, user.password_hash))
        return json(res, 401, { error: "Invalid email or password" });
      const token = generateToken();
      await pool.query(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
        [token, user.id]
      );
      return json(res, 200, { token, user: { id: user.id, username: user.username, email: user.email } });
    }

    if (method === "POST" && pathname === "/api/auth/logout") {
      const token = getToken(req);
      if (token) await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
      return json(res, 200, { ok: true });
    }

    if (method === "GET" && pathname === "/api/auth/me") {
      const user = await getUser(getToken(req));
      if (!user) return json(res, 401, { error: "Not authenticated" });
      return json(res, 200, { user: { id: user.id, username: user.username, email: user.email } });
    }

    // ── Guest chat (no auth, no DB — instant streaming)
    if (method === "POST" && pathname === "/api/chat/guest") {
      const { messages } = await parseBody(req);
      if (!Array.isArray(messages) || !messages.length)
        return json(res, 400, { error: "Messages required" });
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      aiStream(
        messages,
        (chunk) => res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`),
        () => { res.write(`data: ${JSON.stringify({ done: true })}\n\n`); res.end(); },
        (err) => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); }
      );
      return;
    }

    // ── Protected routes — require auth
    const user = await getUser(getToken(req));

    // ── GET /api/conversations
    if (method === "GET" && pathname === "/api/conversations") {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const r = await pool.query(
        "SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100",
        [user.id]
      );
      return json(res, 200, r.rows);
    }

    // ── POST /api/conversations
    if (method === "POST" && pathname === "/api/conversations") {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const { title } = await parseBody(req);
      const r = await pool.query(
        "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *",
        [user.id, title || "New Chat"]
      );
      return json(res, 201, r.rows[0]);
    }

    const convMatch = pathname.match(/^\/api\/conversations\/(\d+)$/);

    // ── GET /api/conversations/:id
    if (method === "GET" && convMatch) {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const id = parseInt(convMatch[1]);
      const c = await pool.query("SELECT * FROM conversations WHERE id = $1 AND user_id = $2", [id, user.id]);
      if (!c.rows[0]) return json(res, 404, { error: "Not found" });
      const m = await pool.query("SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at", [id]);
      return json(res, 200, { ...c.rows[0], messages: m.rows });
    }

    // ── DELETE /api/conversations/:id
    if (method === "DELETE" && convMatch) {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const id = parseInt(convMatch[1]);
      await pool.query("DELETE FROM conversations WHERE id = $1 AND user_id = $2", [id, user.id]);
      res.writeHead(204); res.end();
      return;
    }

    const chatMatch = pathname.match(/^\/api\/conversations\/(\d+)\/chat$/);

    // ── POST /api/conversations/:id/chat
    if (method === "POST" && chatMatch) {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const id = parseInt(chatMatch[1]);
      const { message } = await parseBody(req);
      if (!message?.trim()) return json(res, 400, { error: "Message required" });

      const conv = await pool.query("SELECT * FROM conversations WHERE id = $1 AND user_id = $2", [id, user.id]);
      if (!conv.rows[0]) return json(res, 403, { error: "Forbidden" });

      await pool.query("INSERT INTO messages (conversation_id, role, content) VALUES ($1,'user',$2)", [id, message]);

      const cnt = await pool.query("SELECT COUNT(*) FROM messages WHERE conversation_id = $1", [id]);
      if (parseInt(cnt.rows[0].count) <= 1) {
        await pool.query("UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2", [message.slice(0, 60), id]);
      }

      const hist = await pool.query("SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at", [id]);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      let full = "";
      let done = false;

      aiStream(
        hist.rows,
        (chunk) => { full += chunk; res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`); },
        async () => {
          if (done) return; done = true;
          await pool.query("INSERT INTO messages (conversation_id, role, content) VALUES ($1,'assistant',$2)", [id, full]);
          await pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [id]);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        },
        (err) => {
          console.error("AI stream error:", err);
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        }
      );
      return;
    }

    // ── POST /api/generate-image
    if (method === "POST" && pathname === "/api/generate-image") {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const { prompt, conversationId } = await parseBody(req);
      if (!prompt?.trim()) return json(res, 400, { error: "Prompt required" });
      try {
        const imageUrl = await generateImage(prompt);
        if (conversationId) {
          const cid = parseInt(conversationId);
          const own = await pool.query("SELECT id FROM conversations WHERE id = $1 AND user_id = $2", [cid, user.id]);
          if (own.rows[0]) {
            await pool.query("INSERT INTO messages (conversation_id, role, content) VALUES ($1,'user',$2)", [cid, `Generate image: ${prompt}`]);
            await pool.query("INSERT INTO messages (conversation_id, role, content, image_data) VALUES ($1,'assistant',$2,$3)", [cid, `Generated image for: "${prompt}"`, imageUrl]);
            await pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [cid]);
          }
        }
        return json(res, 200, { imageUrl });
      } catch (e) {
        console.error("Image gen error:", e.message);
        return json(res, 500, { error: e.message || "Image generation failed" });
      }
    }

    // ── POST /api/analyze-image
    if (method === "POST" && pathname === "/api/analyze-image") {
      if (!user) return json(res, 401, { error: "Not authenticated" });
      const { fields, fileBuffer, fileMime } = await parseMultipart(req);
      if (!fileBuffer) return json(res, 400, { error: "No image provided" });
      const base64 = fileBuffer.toString("base64");
      const analysis = await analyzeImage(base64, fileMime, fields.prompt || "");
      if (fields.conversationId) {
        const cid = parseInt(fields.conversationId);
        const own = await pool.query("SELECT id FROM conversations WHERE id = $1 AND user_id = $2", [cid, user.id]);
        if (own.rows[0]) {
          const imgData = `data:${fileMime};base64,${base64}`;
          await pool.query("INSERT INTO messages (conversation_id, role, content, image_data) VALUES ($1,'user',$2,$3)", [cid, fields.prompt || "Analyze this image", imgData]);
          await pool.query("INSERT INTO messages (conversation_id, role, content) VALUES ($1,'assistant',$2)", [cid, analysis]);
          await pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [cid]);
        }
      }
      return json(res, 200, { analysis });
    }

    // ── GET /api/market
    if (method === "GET" && pathname === "/api/market") {
      const [tokens, global] = await Promise.all([fetchMarket(), fetchGlobal()]);
      const tagged = tokens.map(t => ({
        ...t,
        isCapx: t.id === capxCoinId,
      }));
      return json(res, 200, { tokens: tagged, global, capxId: capxCoinId });
    }

    serveFrontend(req, res);
  } catch (err) {
    console.error("Server error:", err);
    if (!res.headersSent) json(res, 500, { error: err.message });
  }
});

// Pre-fetch CAPX ID on startup
fetchCapxId().then(id => { if (id) console.log(`✅ CAPX ID resolved: ${id}`); else console.log("ℹ️  CAPX not found on CoinGecko yet"); });

// Validate environment variables
const envOk = validateEnvironment();

initDB().then(() => {
  if (!envOk) {
    console.warn("\n⚠️  Server starting with missing configuration!");
    console.warn("   AI responses will fail until GEMINI_API_KEY is set.\n");
  }
  server.listen(PORT, "0.0.0.0", () => console.log(`🚀 KhaysAlpha AI running at http://0.0.0.0:${PORT}`));
}).catch(console.error);
