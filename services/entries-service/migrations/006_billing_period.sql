-- Subscriptions can be billed monthly or yearly. The amount itself still lives in
-- `monthly_cost` (kept as-is despite the name -- this migration runner re-applies every
-- file on every boot with no "already applied" tracking, so renaming a column safely here
-- would need extra guarding for no real benefit; the API layer exposes it as `cost`).
ALTER TABLE user_tools ADD COLUMN IF NOT EXISTS billing_period VARCHAR(10) NOT NULL DEFAULT 'monthly';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_tools_billing_period_check') THEN
    ALTER TABLE user_tools ADD CONSTRAINT user_tools_billing_period_check
      CHECK (billing_period IN ('monthly', 'yearly'));
  END IF;
END $$;
