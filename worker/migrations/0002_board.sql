-- Boards of an account. json is the board as the app sent it (validated, not rewritten).
-- A delete is a tombstone (deleted = 1, json NULL) so other devices see it; rev goes up
-- on every change, and a save must name the rev it was based on.
CREATE TABLE board (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  json TEXT,
  PRIMARY KEY (user_id, id)
);
