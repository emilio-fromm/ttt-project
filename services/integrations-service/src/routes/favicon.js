import { Router } from "express";

const router = Router();

// GET /favicon?domain=linear.app -> returns a hosted icon URL for an arbitrary tool/site.
// Kept in integrations-service since it's about reaching out to the outside world,
// distinct from entries-service which only owns our own data.
router.get("/", (req, res) => {
  const domain = (req.query.domain || "").trim();
  if (!domain) return res.status(400).json({ error: "domain is required" });
  const base = process.env.FAVICON_LOOKUP_BASE || "https://www.google.com/s2/favicons";
  res.json({ iconUrl: `${base}?domain=${encodeURIComponent(domain)}&sz=128` });
});

export default router;
