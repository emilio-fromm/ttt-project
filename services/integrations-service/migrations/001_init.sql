CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS github_integrations (
  user_id UUID PRIMARY KEY,
  pat_token_encrypted VARCHAR(1000) NOT NULL,
  repo_owner VARCHAR(255) NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS github_issues_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  issue_number INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  state VARCHAR(20) NOT NULL,
  url VARCHAR(500) NOT NULL,
  updated_at_github TIMESTAMPTZ,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, issue_number)
);
