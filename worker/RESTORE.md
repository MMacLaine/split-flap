# Restoring the accounts database

The D1 database `split-flap` has no copy outside Cloudflare. Its backup is D1 Time Travel, which can put the whole database back to any minute in the last 7 days on the free plan. Older than that, nothing can be restored.

A restore puts back every table for every account. Every write after the restore point is undone, for everyone: boards saved, accounts made, sign-ins. Restore only for damage that is worse than that, like a bad migration or a bug that wiped boards.

Never lower a board's `rev` by hand in D1. The app reads a lower rev as a restore and sends its own copy back over the server's.

Run these from `worker/`, signed in with `npx wrangler login`.

## Before a risky change

Before a migration or anything else that writes to the live database, note the bookmark:

```sh
npx wrangler d1 time-travel info split-flap
```

It prints the current bookmark. Keep it with the change. If the change goes wrong, restore to that bookmark.

## After something has gone wrong

1. Find the bookmark for a time just before the damage. Timestamps are UTC, as RFC 3339 or Unix seconds:

   ```sh
   npx wrangler d1 time-travel info split-flap --timestamp 2026-09-27T20:00:00Z
   ```

   If this fails with an internal error (code 7500), try a slightly later time. It failed on a database a few minutes old in the rehearsal and worked on the live one.

2. Check the damage is what you think, before undoing everyone's writes since:

   ```sh
   npx wrangler d1 execute split-flap --remote --command "SELECT count(*) FROM board WHERE deleted = 0"
   ```

3. Restore:

   ```sh
   npx wrangler d1 time-travel restore split-flap --bookmark <bookmark>
   ```

   It prints the bookmark from before the restore. Keep it, since restoring to that one undoes the restore.

4. Check the counts again, and sign in on maclaine.se to see the boards.

Browsers are local first, so anyone who edited a board after the restore point still has it in their browser. From 0.6.0, their next sync sees that the server's copy (or delete) is older than the one it last agreed with, and sends the browser's version back up to the same board. If two browsers both hold newer work, the second gets the usual conflict copy. Boards made after the restore point are sent again. So a restore loses less than it seems, as long as those browsers come back online. Before 0.6.0 the older server copy replaced the newer one.

## Rehearsal, 27 September 2026

On a throwaway database, `split-flap-rehearsal` (EU jurisdiction), which was deleted afterwards:

- two rows written, the bookmark noted, one row deleted and another added
- restored to the bookmark: the two first rows back, the later one gone
- looking up a bookmark by timestamp failed on that database with code 7500, and worked on the live one for an hour back
