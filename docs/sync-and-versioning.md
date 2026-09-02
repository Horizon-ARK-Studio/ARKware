# Syncing from `main`, and the version pin

This branch is a distribution layer, not a copy of ARKware — see the
root [README](../README.md#where-the-code-actually-lives). It never
merges from `main` via pull request. Instead,
[`scripts/sync-from-main.js`](../scripts/sync-from-main.js) pulls the
small set of files this package actually depends on — `LICENSE`,
`README.md` text, the Android Gradle flavor shape — from `main`, over
local git if available, falling back to a `raw.githubusercontent.com`
fetch when there's no local git to use.

## The pin: `arkware-runtime.json`

```json
{
  "ref": "61e6ba4f1cfed7b1a889e75467003063a466b909",
  "description": "..."
}
```

`ref` is a **fixed commit SHA** on `main` (or, once `main` starts
tagging releases, a tag) — never a moving `main` HEAD. Without this
pin, a published npm package could silently end up pointed at
whatever `main` looks like on the day someone happens to run
`npm install`: an "npm package from yesterday + main from today" bug
that's miserable to trace back. Pinning to an exact commit means
`sync-from-main.js` always pulls the same bytes, regardless of what's
landed on `main` since.

`sync` also runs automatically as this package's `prepare` script, so
a plain `npm install` keeps the LICENSE/README/Android-flavor files
in sync with the pinned commit without any extra step.

## Running it manually

```
npm run sync
```

Equivalent to `node scripts/sync-from-main.js`. Safe to re-run —
it's idempotent against the same pinned `ref`.

## Bumping the pin

Moving the runtime this package depends on forward is a deliberate,
reviewed act, not something that happens automatically:

1. Edit `ref` in [`arkware-runtime.json`](../arkware-runtime.json) to
   the new `main` commit SHA (or tag).
2. Run `npm run sync` to pull the new content.
3. Re-verify both CLIs still work against it — run
   `arkware-shell build` / `arkware-spa build` against a real
   `arkware.config.js` and confirm nothing broke, especially the
   Android flavor shape in
   [`src/lib/android.js`](../src/lib/android.js), which is written
   against the specific `build.gradle.kts` structure on `main` at
   that commit.
4. Commit the updated `ref` together with whatever the sync pulled
   in.

Never let the pin drift silently — a mismatched `ref` is exactly the
failure mode this file exists to prevent. Update `description` in
`arkware-runtime.json` too, so the next person bumping it has context
on what the pinned commit was verified against without needing to dig
through `main`'s history.
