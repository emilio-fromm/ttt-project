-- One cached English-language headline per calendar day, shared by all users so we
-- don't hammer the upstream news API and everyone sees the same "today's news" story.
CREATE TABLE IF NOT EXISTS daily_news (
  news_date DATE PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  source VARCHAR(160),
  description TEXT,
  image_url VARCHAR(1000),
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
