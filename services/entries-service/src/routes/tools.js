import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../authMiddleware.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

const POST_IT_COLORS = ["#FFE08A", "#F6C6E0", "#C7CFFA", "#A6E3E9", "#BFE3C0", "#FFD9A0"];
function randomColor() {
  return POST_IT_COLORS[Math.floor(Math.random() * POST_IT_COLORS.length)];
}

function domainFromInput(input) {
  try {
    const withProtocol = input.includes("://") ? input : `https://${input}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "");
  } catch {
    // not a URL, treat as a bare name -> best-effort guess
    return `${input.toLowerCase().replace(/\s+/g, "")}.com`;
  }
}

// GET /tools  -> full catalog (for onboarding search / "add a new tool" search)
router.get("/", asyncHandler(async (_req, res) => {
  const result = await pool.query("SELECT * FROM tools ORDER BY name ASC");
  res.json({ tools: result.rows });
}));

// GET /tools/search?q=linear  -> catalog match, and if nothing found under that domain yet,
// a live favicon preview so the user can add a brand-new tool that isn't in the catalog.
router.get("/search", asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ existing: [], preview: null });

  // Match both by name (so browsing "note" still surfaces "Notion") and by the domain this
  // query would resolve to (so "slack" and "slack.com" find the same catalog row instead of
  // each offering to create a new one).
  const domain = domainFromInput(q);
  const existing = await pool.query(
    "SELECT * FROM tools WHERE name ILIKE $1 OR domain = $2 ORDER BY name ASC LIMIT 10",
    [`%${q}%`, domain]
  );

  let preview = null;
  if (!existing.rows.some((t) => t.domain === domain)) {
    preview = {
      name: q,
      domain,
      icon_url: `${process.env.FAVICON_LOOKUP_BASE || "https://www.google.com/s2/favicons"}?domain=${domain}&sz=128`,
    };
  }

  res.json({ existing: existing.rows, preview });
}));

// POST /tools  { name, domain }  -> creates a new tool in the shared catalog using a favicon
// lookup, or hands back the existing one if this domain is already in the catalog.
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { name, domain } = req.body;
  if (!name || !domain) return res.status(400).json({ error: "name and domain are required" });

  const iconUrl = `${process.env.FAVICON_LOOKUP_BASE || "https://www.google.com/s2/favicons"}?domain=${domain}&sz=128`;
  const inserted = await pool.query(
    `INSERT INTO tools (name, domain, icon_url, color, is_special, created_by_user_id)
     VALUES ($1, $2, $3, $4, false, $5)
     ON CONFLICT (domain) DO NOTHING RETURNING *`,
    [name, domain, iconUrl, randomColor(), req.userId]
  );
  const tool = inserted.rows[0] || (await pool.query("SELECT * FROM tools WHERE domain = $1", [domain])).rows[0];
  res.status(inserted.rows[0] ? 201 : 200).json({ tool });
}));

// GET /tools/mine  -> the current user's persistent fav-app selection, with the
// subscription cost/billing period they've optionally attached to each one (a per-user
// amount, not part of the shared catalog row, since two people can pay different prices
// for the same tool).
router.get("/mine", requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT t.*, ut.monthly_cost AS cost, ut.billing_period FROM tools t
     JOIN user_tools ut ON ut.tool_id = t.id
     WHERE ut.user_id = $1
     ORDER BY t.name ASC`,
    [req.userId]
  );
  res.json({ tools: result.rows });
}));

// POST /tools/mine  { toolId }  -> add a tool to the user's dashboard
router.post("/mine", requireAuth, asyncHandler(async (req, res) => {
  const { toolId } = req.body;
  if (!toolId) return res.status(400).json({ error: "toolId is required" });
  await pool.query(
    "INSERT INTO user_tools (user_id, tool_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [req.userId, toolId]
  );
  res.status(201).json({ ok: true });
}));

// PATCH /tools/mine/:toolId  { cost, billingPeriod }  -> set/clear what this tool's
// subscription costs this user, billed either "monthly" or "yearly"; shown in that tool's
// info popover on the board.
router.patch("/mine/:toolId", requireAuth, asyncHandler(async (req, res) => {
  const { cost, billingPeriod } = req.body;

  let value = null;
  if (cost !== null && cost !== undefined && cost !== "") {
    value = Number(cost);
    if (Number.isNaN(value) || value < 0) {
      return res.status(400).json({ error: "cost must be a non-negative number" });
    }
  }
  const period = billingPeriod === "yearly" ? "yearly" : "monthly";

  const result = await pool.query(
    `UPDATE user_tools SET monthly_cost = $1, billing_period = $2
     WHERE user_id = $3 AND tool_id = $4
     RETURNING monthly_cost AS cost, billing_period`,
    [value, period, req.userId, req.params.toolId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "That tool isn't on your board yet" });
  res.json(result.rows[0]);
}));

// DELETE /tools/mine/:toolId -> remove a tool from the dashboard
router.delete("/mine/:toolId", requireAuth, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM user_tools WHERE user_id = $1 AND tool_id = $2", [
    req.userId,
    req.params.toolId,
  ]);
  res.json({ ok: true });
}));

// GET /tools/day?date=YYYY-MM-DD -> tools the user has put on that day's board, including
// their per-user subscription cost/billing period (same join as /mine)
router.get("/day", requireAuth, asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });
  const result = await pool.query(
    `SELECT t.*, ut.monthly_cost AS cost, ut.billing_period FROM tools t
     JOIN day_tools dt ON dt.tool_id = t.id
     JOIN user_tools ut ON ut.tool_id = t.id AND ut.user_id = dt.user_id
     WHERE dt.user_id = $1 AND dt.entry_date = $2
     ORDER BY t.name ASC`,
    [req.userId, date]
  );
  res.json({ tools: result.rows });
}));

// POST /tools/day  { toolId, date }  -> add one of the user's tools to that day's board
router.post("/day", requireAuth, asyncHandler(async (req, res) => {
  const { toolId, date } = req.body;
  if (!toolId || !date) return res.status(400).json({ error: "toolId and date are required" });

  const owned = await pool.query("SELECT 1 FROM user_tools WHERE user_id = $1 AND tool_id = $2", [
    req.userId,
    toolId,
  ]);
  if (owned.rows.length === 0) {
    return res.status(400).json({ error: "Add this tool in Settings before putting it on a day's board" });
  }

  await pool.query(
    "INSERT INTO day_tools (user_id, tool_id, entry_date) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [req.userId, toolId, date]
  );
  res.status(201).json({ ok: true });
}));

// DELETE /tools/day/:toolId?date=YYYY-MM-DD -> remove a tool from that day's board
router.delete("/day/:toolId", requireAuth, asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });
  await pool.query("DELETE FROM day_tools WHERE user_id = $1 AND tool_id = $2 AND entry_date = $3", [
    req.userId,
    req.params.toolId,
    date,
  ]);
  res.json({ ok: true });
}));

export default router;
