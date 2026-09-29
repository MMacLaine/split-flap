-- Connections (0.9.2): an account's own sources (an API key, a published sheet), with the
-- same shape and rules as board and blueprint. The json column holds the connection with
-- its value sealed by the Worker (src/seal.js), never in plain text.
CREATE TABLE connection (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  rev INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  json TEXT,
  PRIMARY KEY (user_id, id)
);
