import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// See the matching comment in entries-service/src/db.js -- same reasoning, same opt-in.
const ssl = process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

export const pool = new Pool({ connectionString: process.env.INTEGRATIONS_DB_URL, ssl });

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`[integrations-service] running migration ${file}`);
    await pool.query(sql);
  }
}
