# Session Handoff Ledger

Updated: 2026-04-16T13:25:46.887Z
Current session: session-2026-04-16T13-25-46-851Z-24d98ae8

## Outstanding Snapshots (6)

1. [pending] session-2026-04-01T05-03-28-791Z-3708620b — fix/name-attribute-invalid-value (dirty)
   File: doc/.plan/session-handoff/sessions/session-2026-04-01T05-03-28-791Z-3708620b.md
   Updated: 2026-04-01T05:03:28.791Z

2. [pending] session-2026-04-01T07-08-35-154Z-bbb41348 — main (dirty)
   File: doc/.plan/session-handoff/sessions/session-2026-04-01T07-08-35-154Z-bbb41348.md
   Updated: 2026-04-01T07:08:35.154Z

3. [pending] session-2026-04-01T12-31-18-882Z-b6da409e — refactor/add-to-attio-sheet-diff-based-ui (dirty)
   File: doc/.plan/session-handoff/sessions/session-2026-04-01T12-31-18-882Z-b6da409e.md
   Updated: 2026-04-01T12:31:18.882Z

4. [pending] session-2026-04-01T12-39-39-745Z-3cbf075c — refactor/add-to-attio-sheet-diff-based-ui (dirty)
   File: doc/.plan/session-handoff/sessions/session-2026-04-01T12-39-39-745Z-3cbf075c.md
   Updated: 2026-04-01T12:39:39.745Z

5. [pending] session-2026-04-12T15-43-41-088Z-b22aeeb0 — refactor/add-to-attio-sheet-diff-based-ui (dirty)
   File: doc/.plan/session-handoff/sessions/session-2026-04-12T15-43-41-088Z-b22aeeb0.md
   Updated: 2026-04-12T15:43:41.088Z

6. [pending] session-2026-04-16T13-25-46-851Z-24d98ae8 — fix/existing-contact-badge-ux (dirty)
   File: doc/.plan/session-handoff/sessions/session-2026-04-16T13-25-46-851Z-24d98ae8.md
   Updated: 2026-04-16T13:25:46.851Z

## Recent Activity

- None

## Commands

Run these from the client project root (adjust $HOME/.config if you use a custom config home):

- `node "$HOME/.config/opencode/bin/session-handoff.mjs" list` — show pending snapshots
- `node "$HOME/.config/opencode/bin/session-handoff.mjs" ack <id> [--note "done"]` — mark complete
- `node "$HOME/.config/opencode/bin/session-handoff.mjs" dismiss <id> --reason "why"` — abandon work
- `node "$HOME/.config/opencode/bin/session-handoff.mjs" write --trigger "/pro:session.handoff"` — capture a fresh snapshot

If you vendor the CLI into a repo instead:

- `node bin/session-handoff.mjs list|ack|dismiss|write ...`

Compatibility note: some older snapshot files may still mention `node bin/session-handoff.mjs ...`. If your repo does not contain that file, use the globally installed CLI commands listed above.

All snapshots live under `doc/.plan/session-handoff/sessions/`. Review each file before acknowledging or dismissing it.
