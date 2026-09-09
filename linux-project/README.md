# ARKware -- Linux shell (v2)

First working cut of `docs/Foundational/ROADMAP.md`'s v2 stage: a
native C shell that embeds WebKitGTK directly (via
[webview/webview](https://github.com/webview/webview)'s GTK backend)
and points itself at a config-driven target SPA -- no Neutralino, no
bundled runtime, no dependency on system Chrome.

## Layout

Matches `docs/Foundational/CODE-STYLE.md` section 1's proposed shape:

```
linux-project/
├── vendor/webview.h          -- amalgamated upstream webview/webview, vendored as-is
├── src/
│   ├── main.c                -- entry point + wiring only
│   ├── webview_impl.cc       -- the one C++ TU that compiles webview.h's implementation
│   ├── shell/                -- window chrome + lifecycle (GTK, via webview.h)
│   ├── webview_bridge/       -- SPA <-> native bridge (mirrors android-project's webview/bridge/)
│   ├── media/                -- OS media-session (MPRIS) -- stub, deferred per ROADMAP.md
│   ├── config/                -- target-SPA configuration
│   └── logging/                -- shared logging convention (CODE-STYLE.md section 3)
├── arkware.config.example
└── CMakeLists.txt
```

## Why webview.h

`ROADMAP.md`'s v2 goal is a small C shell embedding WebKitGTK
directly, not a hand-rolled GTK+WebKitGTK integration written from
scratch. `webview.h` *is* that thin embedding on Linux -- its GTK
backend links straight against the system's `libgtk-3` and
`libwebkit2gtk`, the same libraries a hand-written integration would
link against, with no bundled browser runtime and no Chrome
dependency. Using it keeps this shell's own code focused on what
`CODE-STYLE.md` actually asks it to own: config, bridge, logging,
lifecycle -- not GTK plumbing that's already been solved upstream.

`vendor/webview.h` is the amalgamated single header generated from
upstream's `scripts/amalgamate/amalgamate.py`
(`--base core --search include`). To regenerate it against a newer
upstream commit:

```sh
git clone https://github.com/webview/webview.git /tmp/webview-src
cd /tmp/webview-src
python3 scripts/amalgamate/amalgamate.py \
  --base core --search include \
  --output /path/to/linux-project/vendor/webview.h src
```

(requires `clang-format` on `PATH`; the script uses it to format its
output.)

## Building

Requires GTK3 and WebKitGTK dev packages:

```sh
# Debian/Ubuntu
sudo apt-get install cmake pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
```

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

## Running

Copy `arkware.config.example` to `arkware.config` next to the binary
(or pass a path as `argv[1]`) and set `target_url`:

```sh
cp arkware.config.example build/arkware.config
# edit build/arkware.config, then:
./build/arkware
```

Or skip the file entirely for a quick test:

```sh
ARKWARE_TARGET_URL=https://example.com ./build/arkware
```

## What's real vs. deferred

Per `ROADMAP.md`'s v2 scope, this first cut has:

* a working native C shell that launches, loads config, creates a
  WebKitGTK-backed window, and navigates to the configured SPA
  (verified running end-to-end under `xvfb-run` during development)
* a proven `webview_bridge/` mechanism (`arkwareBridgeReady()`) that
  the real opt-in native APIs (`ROADMAP.md`'s "Native bridge surface"
  list) can land on once a stage actually commits to one
* session persistence via WebKitGTK's own cookie/localStorage
  handling -- nothing in this shell manages that separately, per
  `SYSTEM-DESIGN-AGREEMENTS.md`'s ownership test

Deliberately not yet done, per `ROADMAP.md`'s "explicitly deferred"
list and `docs/bugs-caught/`-style verification-before-workaround
discipline:

* tray integration
* MPRIS/media-session integration (`media/` is a logged no-op stub)
* any of the opt-in native bridge APIs beyond the one proof-of-concept
  binding
* packaging/install/update mechanics
