import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { db } from "./db";
import { conversations, messages } from "../shared/schema";
import { sql } from "drizzle-orm";

const app = express();
const PORT = 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

registerRoutes(app);

async function initDB() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    console.log("✅ Database ready");
  } catch (e) {
    console.error("DB init error:", e);
  }
}

initDB().then(() => {
  app.listen(PORT, "localhost", () => {
    console.log(`🚀 KhaysAlpha AI server running on port ${PORT}`);
  });
});
