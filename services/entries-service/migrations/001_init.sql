CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  domain VARCHAR(255),
  icon_url VARCHAR(500),
  color VARCHAR(20) NOT NULL DEFAULT '#FFE08A',
  is_special BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_tools (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id)
);

CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL, -- null = general note
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  color VARCHAR(20) NOT NULL DEFAULT '#FFE08A',
  rotation_deg REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entry_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seed a starter catalog of well-known tools so onboarding has something to show immediately
INSERT INTO tools (name, domain, icon_url, color, is_special) VALUES
  ('GitHub', 'github.com', 'https://www.google.com/s2/favicons?domain=github.com&sz=128', '#D7D2CB', true),
  ('Notion', 'notion.so', 'https://www.google.com/s2/favicons?domain=notion.so&sz=128', '#E3E1DD', false),
  ('Figma', 'figma.com', 'https://www.google.com/s2/favicons?domain=figma.com&sz=128', '#F6C6E0', false),
  ('Discord', 'discord.com', 'https://www.google.com/s2/favicons?domain=discord.com&sz=128', '#C7CFFA', false),
  ('Canva', 'canva.com', 'https://www.google.com/s2/favicons?domain=canva.com&sz=128', '#A6E3E9', false),
  ('Zoho Mail', 'zoho.com', 'https://www.google.com/s2/favicons?domain=zoho.com&sz=128', '#FFD9A0', false),
  ('Xcode', 'developer.apple.com', 'https://www.google.com/s2/favicons?domain=developer.apple.com&sz=128', '#BFE3C0', false)
ON CONFLICT DO NOTHING;
