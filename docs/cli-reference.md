# CLI reference

One binary is installed by `npm install` (via `package.json`'s `bin`
field): `arkware`. Everything is a subcommand under it — no separate
per-platform binaries, and nothing Neutralino-backed.

```
arkware <command> <subcommand> [options]
```

Every subcommand supports `--help`; `arkware --version` prints the
installed `@horizon-ark-studio/arkware` version and exits.

## `arkware android emit-flavor`

Writes a Gradle product-flavor snippet, shaped like the existing
`youtube`/`template` flavors in
`android-project/app/build.gradle.kts` on `main`, derived from
`arkware.config.js`. Does **not** build an APK — paste the output
into `productFlavors`, add the flavor name to the CI matrix in
`.github/workflows/android-build.yml`, push, and CI builds it. Full
walkthrough: [`android-flavor.md`](./android-flavor.md).

```
arkware android emit-flavor [--config <path>] [--out <path>]
arkware android --help
```

Requires `platforms.android.enabled: true` and `platforms.android.flavor`.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--out <path>` | `./arkware-android-flavor.gradle.kts` | Where to write the snippet |
| `--help` | — | Print usage and exit |

---

## `arkware linux build`

Native Linux desktop shell — GTK + WebKitGTK, built with `cmake`
directly. This is the only desktop platform either `main` or this
package ships right now. Full walkthrough:
[`linux-shell.md`](./linux-shell.md).

```
arkware linux build [--config <path>]
arkware linux --help
```

Reads `arkware.config.js`, writes the C shell's own `arkware.config`
(a flat `KEY=value` file — a different format from and different file
than this package's `arkware.config.js`) from `spa.targetUrl` /
`spa.displayName` / `spa.nagHideSelectors` / `spa.nagHideTextMatches`,
copies the vendored `linux-project` source into
`platforms.linux.outDir`, and runs `cmake -S . -B build` +
`cmake --build build` there. Requires `spa.targetUrl` and
`platforms.linux.enabled: true` (defaults to `false` — see
[`linux-shell.md`](./linux-shell.md#why-platformslinuxenabled-defaults-to-false)).

Needs `cmake`, `pkg-config`, and GTK3/WebKitGTK dev packages on
`PATH`. See [`linux-shell.md`](./linux-shell.md#what-it-needs-installed).

On success, the built binary is at
`<platforms.linux.outDir>/build/arkware`.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--help` | — | Print usage and exit |

---

## Global flags

| Flag | Meaning |
|---|---|
| `--version` | Print the installed `@horizon-ark-studio/arkware` version and exit (`arkware --version`, no command needed) |
| `--help` | With no command: top-level command list (`arkware --help`). After a command: that command's own usage (`arkware android --help`, `arkware linux --help`). |

## Common failure modes

- **`cmake: command not found`** (from `arkware linux build`) —
  install `cmake`, `pkg-config`, and the GTK3/WebKitGTK dev packages;
  see [`linux-shell.md`](./linux-shell.md#what-it-needs-installed).
- **`vendor/main/linux-project is missing`** (from `arkware linux build`) —
  run `npm run sync`; if that still comes up empty, the commit pinned
  in `arkware-runtime.json` predates v2's `linux-project` landing on
  `main` and the pin needs bumping first — see
  [`sync-and-versioning.md`](./sync-and-versioning.md).
- **`arkware <command>: ...` error text** — both commands catch
  thrown errors from config loading or scaffolding and print
  `arkware <command>: <message>` before exiting 1; the message itself
  names the missing/invalid field.
- **No `arkware.config.js` found** — pass `--config <path>` or copy
  [`arkware.config.example.js`](../arkware.config.example.js) to your
  project root first (see [`getting-started.md`](./getting-started.md)).
- **`Unknown command`** / **`Unknown subcommand`** — only `android
  emit-flavor` and `linux build` exist. `arkware --help` (or
  `arkware <command> --help`) lists what's actually available.
