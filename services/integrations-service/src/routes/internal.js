import { Router } from "express";
import { pool } from "../db.js";
import { syncIssuesForUser } from "./github.js";

const router = Router();

// POST /internal/sync-all-github
// Called by the github-cache Azure Function on a timer trigger (every 15 min).
// Protected by a shared secret header rather than a user JWT, since no user is logged in
// when a timer fires.
router.post("/sync-all-github", async (req, res) => {
  if (req.headers["x-internal-secret"] !== process.env.INTERNAL_SYNC_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const users = await pool.query("SELECT user_id FROM github_integrations");
  const results = [];
  for (const { user_id } of users.rows) {
    const result = await syncIssuesForUser(user_id);
    results.push({ user_id, ...result });
  }
  res.json({ syncedUsers: results.length, results });
});

export default router;
