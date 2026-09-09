# CLI reference

Three binaries are installed by `npm install` (via `package.json`'s
`bin` field). `arkware-shell` and `arkware-spa` are thin wrappers
around [Neutralino](https://neutralino.js.org)'s `neu build`; `neu`
must already be on `PATH` for them. `arkware-linux` is different — it
builds `main`'s real native C shell (GTK + WebKitGTK) with `cmake`
directly, no Neutralino involved. See
[`linux-shell.md`](./linux-shell.md) for why that's a separate binary
rather than a flag on `arkware-shell`.

Every command supports `--help`; every binary supports `--version`
(prints the installed `@horizon-ark-studio/arkware` version and
exits).

## `arkware-shell`

Native desktop window pointed at a live URL. The window chrome is
native; the content is whatever `spa.targetUrl` serves — the same
shell/content split as ARKware's Android WebView shell, generalized
to desktop.

```
arkware-shell build [--config <path>]
arkware-shell emit-android-flavor [--config <path>] [--out <path>]
arkware-shell --help
```

### `build`

Reads `arkware.config.js`, scaffolds a Neutralino project under
`platforms.desktop.outDir`, and runs `neu build` there. Requires
`spa.targetUrl` and `platforms.desktop.enabled: true`.

Exit code mirrors `neu build`'s: non-zero on build failure.

### `emit-android-flavor`

Writes a Gradle product-flavor snippet, shaped like the existing
`youtube`/`template` flavors in
`android-project/app/build.gradle.kts` on `main`, derived from the
same `arkware.config.js`. Does **not** build an APK — paste the
output into `productFlavors`, add the flavor name to the CI matrix in
`.github/workflows/android-build.yml`, push, and CI builds it. Full
walkthrough: [`android-flavor.md`](./android-flavor.md).

Requires `platforms.android.enabled: true` and `platforms.android.flavor`.

### Options

| Flag | Applies to | Default | Meaning |
|---|---|---|---|
| `--config <path>` | both commands | `./arkware.config.js` | Config file to load |
| `--out <path>` | `emit-android-flavor` only | `./arkware-android-flavor.gradle.kts` | Where to write the snippet |
| `--version` | either, standalone | — | Print version and exit |
| `--help` | either, standalone | — | Print usage and exit |

---

## `arkware-spa`

Offline native app bundling a local SPA build. Copies
`spa.buildDir` (a build you already produced — `dist/`, `build/`,
etc.) into the Neutralino app's own resources and serves it locally,
so the result has no network dependency on the original site. Use
this instead of `arkware-shell` when you own the SPA's build output.

```
arkware-spa build [--config <path>]
arkware-spa --help
```

### `build`

Reads `arkware.config.js`, scaffolds a Neutralino project under
`platforms.desktop.outDir`, copies `spa.buildDir` into it, and runs
`neu build`. Requires `spa.buildDir` and
`platforms.desktop.enabled: true`.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--version` | — | Print version and exit |
| `--help` | — | Print usage and exit |

---

## `arkware-linux`

Native Linux desktop shell — GTK + WebKitGTK, built with `cmake`
directly. **Not** Neutralino-backed, unlike the two CLIs above. Full
walkthrough: [`linux-shell.md`](./linux-shell.md).

```
arkware-linux build [--config <path>]
arkware-linux --version
arkware-linux --help
```

### `build`

Reads `arkware.config.js`, writes the C shell's own `arkware.config`
(a flat `KEY=value` file — a different format from and different file
than this package's `arkware.config.js`) from `spa.targetUrl` /
`spa.displayName` / `spa.nagHideSelectors` / `spa.nagHideTextMatches`,
copies the vendored `linux-project` source into
`platforms.linux.outDir`, and runs `cmake -S . -B build` +
`cmake --build build` there. Requires `spa.targetUrl` and
`platforms.linux.enabled: true` (this defaults to `false`, unlike
`platforms.desktop.enabled` — see [`linux-shell.md`](./linux-shell.md#why-platformslinuxenabled-defaults-to-false)).

Needs `cmake`, `pkg-config`, and GTK3/WebKitGTK dev packages on
`PATH` — not `neu`. See [`linux-shell.md`](./linux-shell.md#what-it-needs-installed).

On success, the built binary is at
`<platforms.linux.outDir>/build/arkware`.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--version` | — | Print version and exit |
| `--help` | — | Print usage and exit |

---

## Common failure modes

- **`neu: command not found`** — install the [Neutralino CLI](https://neutralino.js.org)
  and confirm it's on `PATH`; `arkware-shell`/`arkware-spa` don't
  vendor it. (Doesn't apply to `arkware-linux`, which uses `cmake`
  instead — see that command's own failure mode below.)
- **`cmake: command not found`** (from `arkware-linux build`) —
  install `cmake`, `pkg-config`, and the GTK3/WebKitGTK dev packages;
  see [`linux-shell.md`](./linux-shell.md#what-it-needs-installed).
- **`vendor/main/linux-project is missing`** (from `arkware-linux build`) —
  run `npm run sync`; if that still comes up empty, the commit pinned
  in `arkware-runtime.json` predates v2's `linux-project` landing on
  `main` and the pin needs bumping first — see
  [`sync-and-versioning.md`](./sync-and-versioning.md).
- **`<bin-name>: ...` error text** — all three binaries catch thrown
  errors from config loading or scaffolding and print
  `<bin-name>: <message>` before exiting 1; the message itself names
  the missing/invalid field.
- **No `arkware.config.js` found** — pass `--config <path>` or copy
  [`arkware.config.example.js`](../arkware.config.example.js) to your
  project root first (see [`getting-started.md`](./getting-started.md)).
