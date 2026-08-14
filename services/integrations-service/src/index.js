import "dotenv/config";
import express from "express";
import cors from "cors";
import { runMigrations } from "./db.js";
import githubRoutes from "./routes/github.js";
import faviconRoutes from "./routes/favicon.js";
import internalRoutes from "./routes/internal.js";
import newsRoutes from "./routes/news.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "integrations-service" }));

app.use("/github", githubRoutes);
app.use("/favicon", faviconRoutes);
app.use("/internal", internalRoutes);
app.use("/news", newsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.INTEGRATIONS_PORT || 4001;

async function start() {
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await runMigrations();
      break;
    } catch (err) {
      console.log(`[integrations-service] DB not ready yet (attempt ${attempt}/10): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  app.listen(port, () => console.log(`[integrations-service] listening on :${port}`));
}

start();
