import { Router } from "express";
import fetch from "node-fetch";
import { pool } from "../db.js";
import { requireAuth } from "../authMiddleware.js";

const router = Router();

// Free, keyless mirror of NewsAPI.org's top-headlines endpoint (English, general category,
// US edition). No signup needed, which is what makes this genuinely "free" for the Daily
// News tool. Swap in a real https://newsapi.org/v2/top-headlines?...&apiKey=... once you
// have your own key -- the response shape (articles[].{title,url,source,description,...})
// is the same either way.
const NEWS_API_URL =
  process.env.NEWS_API_URL || "https://saurav.tech/NewsAPI/top-headlines/category/general/us.json";

function pickHeadline(articles) {
  return (articles || []).find((a) => a.title && a.title !== "[Removed]") || null;
}

// GET /news/today?date=YYYY-MM-DD -> the day's single headline, cached in Postgres so
// every user sees the same story for that date and repeated visits don't re-hit the API.
router.get("/today", requireAuth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });

  const cached = await pool.query("SELECT * FROM daily_news WHERE news_date = $1", [date]);
  if (cached.rows.length > 0) return res.json({ news: cached.rows[0] });

  let article;
  try {
    const response = await fetch(NEWS_API_URL);
    if (!response.ok) throw new Error(`news API error ${response.status}`);
    const data = await response.json();
    article = pickHeadline(data.articles);
  } catch (err) {
    console.error("[integrations-service] news fetch failed:", err.message);
    return res.status(502).json({ error: "Could not fetch today's news right now" });
  }
  if (!article) return res.status(404).json({ error: "No headline available" });

  const inserted = await pool.query(
    `INSERT INTO daily_news (news_date, title, url, source, description, image_url, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (news_date) DO NOTHING
     RETURNING *`,
    [
      date,
      article.title,
      article.url,
      article.source?.name || null,
      article.description || null,
      article.urlToImage || null,
      article.publishedAt || null,
    ]
  );

  // A concurrent request may have won the insert race; either way, read back the row.
  const news = inserted.rows[0] || (await pool.query("SELECT * FROM daily_news WHERE news_date = $1", [date])).rows[0];
  res.json({ news });
});

export default router;
