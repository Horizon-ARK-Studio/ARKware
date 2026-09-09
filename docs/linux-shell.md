# Linux packaging: config → real native C shell → `cmake --build`

`arkware-linux` is a different kind of CLI from `arkware-shell` /
`arkware-spa`. Those two scaffold a **Neutralino** project and shell
out to `neu build`. `arkware-linux` doesn't touch Neutralino at all —
it scaffolds and builds `main`'s actual v2 desktop shell: a native C
program embedding WebKitGTK directly
([`docs/Foundational/ROADMAP.md`](https://github.com/Horizon-ARK-Studio/ARKware/blob/main/docs/Foundational/ROADMAP.md#v2----desktop-linux-native-c-shell)'s
v2 stage on `main`), via
[webview/webview](https://github.com/webview/webview)'s GTK backend.
This is the reconciliation the root README on `main` flagged as
follow-up work once Neutralino stopped being the desktop plan — see
that README's Platforms table and the note under it.

## Why a separate CLI instead of a third `arkware-shell` mode

`arkware-shell build` and `arkware-linux build` produce genuinely
different artifacts from the same `arkware.config.js`: one is a
Neutralino-packaged webview app, the other is a real
`cmake`-built native binary linked against the system's own
`libgtk-3` / `libwebkit2gtk`. Folding that into `arkware-shell` as a
`--platform linux` flag would hide a real architectural difference
(and a real dependency difference — `neu` vs. `cmake`+`pkg-config`+
GTK3/WebKitGTK dev headers) behind one flag on one command. A
separate binary makes what's actually being built, and what it
depends on, obvious from the command name alone.

## What it needs installed

`arkware-linux` doesn't vendor a toolchain, same stance
`neutralino.js`'s `build()` takes toward `neu`. You need:

- `cmake` and `pkg-config` on `PATH`
- GTK3 and WebKitGTK development packages — e.g. on Debian/Ubuntu:

  ```sh
  sudo apt-get install cmake pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
  ```

  See `linux-project/README.md` on `main` for other distros.

## Generate + build

```
arkware-linux build [--config <path>]
```

Requires, in `arkware.config.js`:

- `platforms.linux.enabled: true` — **off by default**, unlike
  `platforms.desktop`; opt in once the toolchain above is installed
- `spa.targetUrl` — the live URL the native window points at (same
  field `arkware-shell build` reads; there's no `arkware-linux`
  counterpart to `arkware-spa`'s offline/bundled mode yet)
- `spa.displayName`

What it does, in order:

1. Confirms `vendor/main/linux-project` exists locally (see
   [`sync-and-versioning.md`](./sync-and-versioning.md) — pulled by
   `npm run sync` from the commit pinned in `arkware-runtime.json`).
   If it's missing, the error tells you to run the sync, or to bump
   the pin first if the currently-pinned commit predates v2's
   `linux-project` landing on `main`.
2. Copies that vendored source into `platforms.linux.outDir`.
3. Writes that shell's own config file (`arkware.config`, a flat
   `KEY=value` format — **not** the same file as this package's
   `arkware.config.js`) into the copied project, from
   `spa.targetUrl` / `spa.displayName` / `spa.nagHideSelectors` /
   `spa.nagHideTextMatches` — the same field values
   `emit-android-flavor` reads, reshaped for this platform's own
   config format instead of Gradle `BuildConfig` fields.
4. Runs `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release` then
   `cmake --build build` inside the copied project — the exact two
   commands `linux-project/README.md` documents for building it by
   hand.

On success, the binary is at
`<platforms.linux.outDir>/build/arkware`.

## Why `platforms.linux.enabled` defaults to `false`

`platforms.desktop` (the Neutralino path) stays the zero-config
default so every existing `arkware.config.js` keeps working exactly
as before. The native Linux shell is newer, has a heavier local
toolchain requirement (system GTK3/WebKitGTK headers, not just `neu`
on `PATH`), and hasn't had the same real-world mileage yet — so it's
opt-in, the same way a project would opt in to any new platform
target.

## What's not built by this yet

Same "reconciling is follow-up work" spirit the `main`-branch README
called out: `arkware-linux` currently only covers what `main`'s v2
"done when" bar (`ROADMAP.md`) covers — window + WebKitGTK content,
config-driven target URL. It does not (yet) expose:

- tray integration
- MPRIS/media-session bindings (the shell's own `media/` module is a
  documented no-op stub on `main` — see that module's own comments)
- Windows/macOS equivalents — `main`'s `ROADMAP.md` has those as
  "not yet staged," so there's nothing for this package to wrap yet

See also [`config-reference.md`](./config-reference.md) for the full
`platforms.linux` field list, and
[`cli-reference.md`](./cli-reference.md) for `arkware-linux`'s full
flag reference alongside the other two CLIs.
