import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "../authMiddleware.js";
import { uploadImage, guessThumbnailUrl } from "../blobStorage.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function randomRotation() {
  // small tilt, like a hand-placed post-it: -6deg to 6deg
  return Math.round((Math.random() * 12 - 6) * 100) / 100;
}

async function attachImages(entryIds) {
  if (entryIds.length === 0) return {};
  const result = await pool.query(
    `SELECT * FROM entry_images WHERE entry_id = ANY($1) ORDER BY created_at ASC`,
    [entryIds]
  );
  const byEntry = {};
  for (const row of result.rows) {
    byEntry[row.entry_id] = byEntry[row.entry_id] || [];
    byEntry[row.entry_id].push(row);
  }
  return byEntry;
}

// GET /entries?date=YYYY-MM-DD&toolId=<uuid|null>
// date alone            -> every post-it on that day's board (tool-specific + general), for grouping client-side
// date + toolId=null    -> just that day's general notes
// date + toolId=<uuid>  -> just that day's notes for one tool
// toolId with no date   -> all-time notes for one tool (kept for callers that don't care about days)
router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { toolId, date } = req.query;
  const conditions = ["user_id = $1"];
  const params = [req.userId];

  if (date) {
    params.push(date);
    conditions.push(`entry_date = $${params.length}`);
  }
  if (toolId === "null") {
    conditions.push("tool_id IS NULL");
  } else if (toolId) {
    params.push(toolId);
    conditions.push(`tool_id = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT * FROM entries WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    params
  );
  const images = await attachImages(result.rows.map((r) => r.id));
  const entries = result.rows.map((e) => ({ ...e, images: images[e.id] || [] }));
  res.json({ entries });
}));

// POST /entries  { toolId, title, description, date }
// `date` is the board day this post-it belongs to (defaults to today). Notes don't carry
// their own deadline -- which day they're on *is* the date, set entirely by the calendar.
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { toolId, title, description, date } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  let color = "#FFE08A";
  if (toolId) {
    const tool = await pool.query("SELECT color FROM tools WHERE id = $1", [toolId]);
    if (tool.rows[0]) color = tool.rows[0].color;
  }

  const result = await pool.query(
    `INSERT INTO entries (user_id, tool_id, title, description, color, rotation_deg, entry_date)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE)) RETURNING *`,
    [req.userId, toolId || null, title, description || null, color, randomRotation(), date || null]
  );
  res.status(201).json({ entry: { ...result.rows[0], images: [] } });
}));

// Surfaces multer's own errors (bad multipart body, file over the size limit) as a clear
// JSON response instead of an opaque 500 -- and, since it's an error-handling middleware
// (4 args), Express routes multer failures here automatically without touching the route
// handler below.
function handleUploadError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "That image is over the 8MB limit -- try a smaller file." });
    }
    return res.status(400).json({ error: `Could not read the uploaded image (${err.code}).` });
  }
  next(err);
}

// POST /entries/:id/images  (multipart form field: "image")
router.post(
  "/:id/images",
  requireAuth,
  upload.single("image"),
  handleUploadError,
  asyncHandler(async (req, res) => {
    const entry = await pool.query("SELECT id FROM entries WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.userId,
    ]);
    if (entry.rows.length === 0) return res.status(404).json({ error: "Entry not found" });
    if (!req.file) return res.status(400).json({ error: "image file is required" });

    // uploadImage() talks to Azure Blob Storage (Azurite locally); this inner try/catch
    // gives it a specific, actionable error message rather than the generic one the outer
    // asyncHandler would produce for any other failure in this route.
    let imageUrl, blobName;
    try {
      ({ imageUrl, blobName } = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype));
    } catch (err) {
      console.error("[entries-service] blob upload failed:", err.message);
      return res.status(502).json({ error: "Could not store the image right now. Try again in a moment." });
    }

    // The thumbnail is generated asynchronously by the Azure Function blob trigger.
    // We store the URL it *will* write to so the frontend can poll/fallback to the original.
    const thumbnailUrl = guessThumbnailUrl(blobName);

    const result = await pool.query(
      `INSERT INTO entry_images (entry_id, image_url, thumbnail_url) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, imageUrl, thumbnailUrl]
    );
    res.status(201).json({ image: result.rows[0] });
  })
);

// PATCH /entries/:id  { title, description }
router.patch("/:id", requireAuth, asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const result = await pool.query(
    `UPDATE entries SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       updated_at = now()
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [title, description, req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Entry not found" });
  res.json({ entry: result.rows[0] });
}));

// DELETE /entries/:id
router.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM entries WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  res.json({ ok: true });
}));

export default router;
