-- Everything on the board is now scoped to a calendar day: which tools are "in use"
-- on a given day, and which post-its belong to that day (tool-specific or general).

ALTER TABLE entries ADD COLUMN IF NOT EXISTS entry_date DATE NOT NULL DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (user_id, entry_date);

-- Which of the user's tools (see user_tools) they've pulled onto a particular day's board.
CREATE TABLE IF NOT EXISTS day_tools (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id, entry_date)
);
