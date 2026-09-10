# Linux packaging: config → real native C shell → `cmake --build`

`arkware linux build` scaffolds and builds `main`'s actual v2 desktop
shell: a native C program embedding WebKitGTK directly
([`docs/Foundational/ROADMAP.md`](https://github.com/Horizon-ARK-Studio/ARKware/blob/main/docs/Foundational/ROADMAP.md#v2----desktop-linux-native-c-shell)'s
v2 stage on `main`), via
[webview/webview](https://github.com/webview/webview)'s GTK backend.
There's no Neutralino anywhere in this package — `main`'s
`ROADMAP.md` is explicit that desktop is "one native C shell per OS,"
and this is that shell for Linux, the only desktop target either
`main` or this package ships right now.

## Why its own subcommand

`arkware linux build` produces a `cmake`-built native binary linked
against the system's own `libgtk-3` / `libwebkit2gtk` — a real
dependency (`cmake` + `pkg-config` + GTK3/WebKitGTK dev headers) that
`arkware android build` doesn't need at all. Keeping it as its
own subcommand, rather than a flag on `android`, makes what's
actually being built, and what it depends on, obvious from the
command name alone.

## What it needs installed

`arkware linux build` doesn't vendor a toolchain — same "spawn the
real toolchain, don't reimplement it" stance the rest of this package
takes. You need:

- `cmake` and `pkg-config` on `PATH`
- GTK3 and WebKitGTK development packages — e.g. on Debian/Ubuntu:

  ```sh
  sudo apt-get install cmake pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
  ```

  See `linux-project/README.md` on `main` for other distros.

## Generate + build + package

```
arkware linux build [--config <path>] [--app-img|--debian|--rpm]
```

Requires, in `arkware.config.js`:

- `platforms.linux.enabled: true` — **off by default**; opt in once
  the toolchain above is installed
- `spa.targetUrl` — the live URL the native window points at (there's
  no offline/bundled mode in this package)
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
   `spa.nagHideTextMatches` — the same field values `android
   build` reads, reshaped for this platform's own config format
   instead of Gradle `BuildConfig` fields.
4. Runs `cmake -S . -B build -DCMAKE_BUILD_TYPE=Release` then
   `cmake --build build` inside the copied project — the exact two
   commands `linux-project/README.md` documents for building it by
   hand.
5. Wraps the built binary into one installable package file, per
   whichever format flag was passed (default `--app-img` if none
   was):

   | Flag | Format | Needs on `PATH` |
   |---|---|---|
   | *(none)* / `--app-img` | `.AppImage` | `appimagetool` ([releases](https://github.com/AppImage/appimagetool/releases) — single `chmod +x` executable, no install step) |
   | `--debian` | `.deb` | `dpkg-deb` (ships by default on Debian/Ubuntu) |
   | `--rpm` | `.rpm` | `rpmbuild` (`apt-get install rpm` / `dnf install rpm-build`) |

   Each of these is staged through `cmake --install build --prefix
   <staging dir>` first — the binary's location inside the package
   comes from `linux-project`'s own `install()` rule, not a
   hand-maintained copy list — plus a generated `.desktop` entry (and
   your `app.icon`, if set). AppImage bundles nothing beyond what
   `cmake --install` and the system linker resolve; `.deb`/`.rpm`
   instead declare `libgtk-3`/`libwebkit2gtk` as package dependencies,
   the normal convention for either format.

On success, the packaged file is at
`<platforms.linux.outDir>/dist/`, and its path is printed.

## Building in CI instead

```
arkware linux build --github-actions [--app-img|--debian|--rpm]
```

Skips scaffolding/building/packaging on your own machine and instead
writes `.github/workflows/arkware-linux-build.yml` (relative to
`arkware.config.js`) — a workflow that installs the toolchain from
the table above itself (including downloading `appimagetool` — it
isn't `apt`-installable) and runs the same `arkware linux build`
command in CI on every push to `main`. Pass a format flag to generate
a workflow that builds just that one format; pass none and it builds
all three as a matrix, uploading each as its own artifact. Commit and
push the generated file — no local GTK/WebKitGTK/cmake toolchain
needed for this step, since it never runs locally.

## Why `platforms.linux.enabled` defaults to `false`

Even though this is the only desktop target this package ships,
`android build` needs nothing beyond Node.js, while `linux
build` needs a heavier local toolchain (system GTK3/WebKitGTK
headers, `cmake`, `pkg-config`, plus whichever packaging tool the
chosen format needs). Defaulting `platforms.linux.enabled` to `false`
keeps `npm install` + config authoring frictionless for anyone only
touching the Android side, and makes opting into the native shell a
deliberate step once that toolchain is actually installed — the same
way a project would opt in to any platform target with real system
dependencies. `--github-actions` sidesteps needing any of this
locally at all.

## What's not built by this yet

Same "reconciling is follow-up work" spirit the `main`-branch README
called out: `arkware linux build` currently only covers what `main`'s
v2 "done when" bar (`ROADMAP.md`) covers — window + WebKitGTK
content, config-driven target URL. It does not (yet) expose:

- tray integration
- MPRIS/media-session bindings (the shell's own `media/` module is a
  documented no-op stub on `main` — see that module's own comments)
- Windows/macOS equivalents — `main`'s `ROADMAP.md` has those as
  "not yet staged," so there's nothing for this package to wrap yet
- AppImage dependency bundling (via e.g. `linuxdeploy`) — today's
  `--app-img` packages exactly what `cmake --install` produces, not a
  fully self-contained bundle of non-system shared libraries

See also [`config-reference.md`](./config-reference.md) for the full
`platforms.linux` field list, and
[`cli-reference.md`](./cli-reference.md) for `arkware linux build`'s
full flag reference alongside `arkware android build`.
