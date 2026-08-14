import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db.js";
import authRoutes from "./routes/auth.js";
import toolsRoutes from "./routes/tools.js";
import entriesRoutes from "./routes/entries.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "entries-service" }));

app.use("/auth", authRoutes);
app.use("/tools", toolsRoutes);
app.use("/entries", entriesRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.ENTRIES_PORT || 4000;

async function start() {
  // small retry loop so we don't crash-loop while postgres is still starting in docker-compose
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await runMigrations();
      break;
    } catch (err) {
      console.log(`[entries-service] DB not ready yet (attempt ${attempt}/10): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  app.listen(port, () => console.log(`[entries-service] listening on :${port}`));
}

start();
