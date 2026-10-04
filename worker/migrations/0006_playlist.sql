-- 0.10.1: playlists point at boards. A playlist is stored as the app sent it (validated),
-- with the same revisions and tombstones as board, blueprint and connection. The account's
-- boards are the blueprint rows from now on (every board, once).
CREATE TABLE playlist (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  json TEXT,
  PRIMARY KEY (user_id, id)
);
-- Settings kept with the account, one row each (home, last), the same shape again.
CREATE TABLE settings (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  json TEXT,
  PRIMARY KEY (user_id, id)
);
-- Which one-off moves an account has had. 0.10.1 is the storyboards to playlists and boards,
-- run on the server in one batch on the first request for the playlists. The old board rows
-- are left as they are, as the way back.
CREATE TABLE migration (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (user_id, name)
);
