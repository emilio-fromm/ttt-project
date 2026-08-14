-- Two bugs let the tool catalog fill up with duplicates:
--  1. The 001 seed INSERT used "ON CONFLICT DO NOTHING" with no unique constraint to
--     conflict against, so every migration re-run (e.g. a nodemon restart in dev) added
--     another copy of every seeded tool.
--  2. The "add a new tool" search (GET /tools/search, POST /tools) only checked for an
--     existing tool by *name*, so searching a domain the catalog already had under a
--     different spelling (e.g. "slack" vs "slack.com") created a second row for the same
--     site. Both call sites are fixed in routes/tools.js; this migration cleans up the
--     duplicates that already exist and adds a real constraint so it can't happen again.

DO $$
DECLARE
  dup RECORD;
  ids UUID[];
BEGIN
  FOR dup IN
    SELECT domain, array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM tools
    WHERE domain IS NOT NULL
    GROUP BY domain
    HAVING COUNT(*) > 1
  LOOP
    ids := dup.ids; -- ids[1] is the row we keep (oldest); the rest get merged into it

    DELETE FROM user_tools ut
      WHERE ut.tool_id = ANY(ids[2:])
        AND EXISTS (SELECT 1 FROM user_tools k WHERE k.user_id = ut.user_id AND k.tool_id = ids[1]);
    UPDATE user_tools SET tool_id = ids[1] WHERE tool_id = ANY(ids[2:]);

    DELETE FROM day_tools dt
      WHERE dt.tool_id = ANY(ids[2:])
        AND EXISTS (
          SELECT 1 FROM day_tools k
          WHERE k.user_id = dt.user_id AND k.tool_id = ids[1] AND k.entry_date = dt.entry_date
        );
    UPDATE day_tools SET tool_id = ids[1] WHERE tool_id = ANY(ids[2:]);

    UPDATE entries SET tool_id = ids[1] WHERE tool_id = ANY(ids[2:]);

    DELETE FROM tools WHERE id = ANY(ids[2:]);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tools_domain_unique') THEN
    ALTER TABLE tools ADD CONSTRAINT tools_domain_unique UNIQUE (domain);
  END IF;
END $$;
