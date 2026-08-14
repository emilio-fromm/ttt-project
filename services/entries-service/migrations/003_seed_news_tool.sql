-- Add a "Daily News" catalog tool so the free news headline can be picked in Settings
-- and pulled onto a day's board just like any other tool. Guarded with WHERE NOT EXISTS
-- (rather than the earlier ON CONFLICT DO NOTHING, which has no unique target on `tools`
-- and would insert nothing to conflict against) so this migration is safe to re-run.
INSERT INTO tools (name, domain, icon_url, color, is_special)
SELECT 'Daily News', 'news.google.com', 'https://www.google.com/s2/favicons?domain=news.google.com&sz=128', '#FFE08A', true
WHERE NOT EXISTS (SELECT 1 FROM tools WHERE domain = 'news.google.com');
