-- Firmen-Premium: Team-Seats + admin-editierbare Tarife

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS premium_seats (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(owner_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_premium_seats_owner ON premium_seats(owner_id);
