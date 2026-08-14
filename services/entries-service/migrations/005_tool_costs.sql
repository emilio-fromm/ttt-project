-- Monthly cost lives on the user's own link to a tool (not on the shared `tools` catalog
-- row) because the same catalog tool can be on a different plan/price for each user.
ALTER TABLE user_tools ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10,2);
