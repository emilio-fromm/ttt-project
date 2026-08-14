import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAuth } from "../authMiddleware.js";
import { asyncHandler } from "../asyncHandler.js";

const router = Router();

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// POST /auth/register  { email, password, toolIds: [uuid, ...] }
router.post("/register", asyncHandler(async (req, res) => {
  const { email, password, toolIds = [] } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const insertUser = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
    [email, passwordHash]
  );
  const user = insertUser.rows[0];

  if (Array.isArray(toolIds) && toolIds.length > 0) {
    const values = toolIds.map((_, i) => `($1, $${i + 2})`).join(", ");
    await pool.query(
      `INSERT INTO user_tools (user_id, tool_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [user.id, ...toolIds]
    );
  }

  const token = issueToken(user.id);
  res.status(201).json({ token, user });
}));

// POST /auth/login  { email, password }
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = issueToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, created_at: user.created_at } });
}));

// GET /auth/me
router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT id, email, created_at FROM users WHERE id = $1", [req.userId]);
  if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
  res.json({ user: result.rows[0] });
}));

export default router;
