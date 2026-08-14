import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({ connectionString: process.env.ENTRIES_DB_URL });

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, "..", "migrations");
  const files = fs.readdirSync(migrationsDir).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`[entries-service] running migration ${file}`);
    await pool.query(sql);
  }
}
