-- Feeds (0.9.3): the Worker fetches a feed for a wall screen only if some account has added
-- it as a connection. The lookup is an HMAC of the feed's address (worker/src/feeds.js),
-- kept on the connection's own row, so there is nothing to keep in step and the address
-- is not stored in plain text for the lookup. A daily count caps new feeds for everyone.
ALTER TABLE connection ADD COLUMN lookup TEXT;
CREATE INDEX connection_lookup ON connection (lookup) WHERE lookup IS NOT NULL AND deleted = 0;
CREATE TABLE feed_day (
  day TEXT PRIMARY KEY,
  n INTEGER NOT NULL
);
