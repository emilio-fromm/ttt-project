import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Render's managed Postgres requires SSL when connected to via its *external* URL
// (the *internal* URL, used service-to-service within Render's own network, usually
// doesn't need it) -- local docker-compose Postgres doesn't support SSL at all, so this
// stays off unless explicitly opted into. Without it, every query would fail against a
// Render external URL with a low-level connection error that's easy to mistake for
// something else entirely (e.g. a route just returning a bare 500).
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

export const pool = new Pool({ connectionString: process.env.ENTRIES_DB_URL, ssl });

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`[entries-service] running migration ${file}`);
    await pool.query(sql);
  }
}
