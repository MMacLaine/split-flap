-- My boards (0.7.1): an account's blueprints, one board each with the size and theme it
-- was made at. The same shape and rules as board: revisions, tombstones, stored as sent.
CREATE TABLE blueprint (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  json TEXT,
  PRIMARY KEY (user_id, id)
);
