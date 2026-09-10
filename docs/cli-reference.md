# CLI reference

One binary is installed by `npm install` (via `package.json`'s `bin`
field): `arkware`. Everything is a subcommand under it — no separate
per-platform binaries, and nothing Neutralino-backed.

```
arkware <command> <subcommand> [options]
```

Every subcommand supports `--help`; `arkware --version` prints the
installed `@horizon-ark-studio/arkware` version and exits.

## `arkware android build` / `arkware android spa-native`

Scaffolds the full vendored `android-project` tree into
`platforms.android.outDir` and splices a product-flavor block into
its `app/build.gradle.kts`, shaped like the existing
`youtube`/`template` flavors already there on `main` — the same shape
`linux build` has, working the same way whether the flavor points at
a live URL or bundles a local site. Does **not** run Gradle unless
`--build` is passed. Full walkthrough:
[`android-flavor.md`](./android-flavor.md).

```
arkware android build [--config <path>] [--assets <path>] [--build]
arkware android spa-native [--config <path>] [--assets <path>] [--build]
arkware android --help
```

`spa-native` is the same command with bundled local assets required —
it errors if neither `--assets` nor
`platforms.android.bundledAssets` is set. Plain `build` allows either
mode: omit `--assets` (and `platforms.android.bundledAssets`) to
point the flavor at `spa.targetUrl` instead.

Requires `platforms.android.enabled: true`, `platforms.android.flavor`,
and `vendor/main/android-project` present (`npm run sync` if not).

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--assets <path>` | — | Local site directory (with `index.html`) to bundle; overrides `platforms.android.bundledAssets.assetsDir`. Required for `spa-native` |
| `--build` | off | Also run `./gradlew assemble<Flavor>Debug` locally (needs a JDK + Android SDK on `PATH`) |
| `--help` | — | Print usage and exit |

---

## `arkware android flavor-snippet`

The config-authoring-only path, with no local scaffold at all: writes
just the Gradle product-flavor snippet described above to
`./arkware-android-flavor.gradle.kts` by default. Paste the output
into `productFlavors` on `main`'s own checkout, add the flavor name to
the CI matrix in `.github/workflows/android-build.yml`, push, and CI
builds it — this is how a flavor scaffolded locally via `build` also
gets a CI-built APK. Full walkthrough:
[`android-flavor.md`](./android-flavor.md).

```
arkware android flavor-snippet [--config <path>] [--out <path>]
```

Requires `platforms.android.enabled: true` and `platforms.android.flavor`.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--out <path>` | `./arkware-android-flavor.gradle.kts` | Where to write the snippet |
| `--help` | — | Print usage and exit |

---

## `arkware android spa-shell`

Recognized, but **not implemented yet** — pointing the shell at a
live URL with an offline-fallback SVG needs real capability that
doesn't exist on `main`'s Android shell today. Running it prints an
explanation and exits 1 rather than a bare "unknown subcommand" error.
See
[`PROPOSAL-spa-shell-and-spa-native.md`](./PROPOSAL-spa-shell-and-spa-native.md)
for exactly what's missing, on both platforms, and why.

---

## `arkware linux build`

Native Linux desktop shell — GTK + WebKitGTK, built with `cmake`
directly, then packaged into one installable file. This is the only
desktop platform either `main` or this package ships right now. Full
walkthrough: [`linux-shell.md`](./linux-shell.md).

```
arkware linux build [--config <path>] [--app-img|--debian|--rpm]
arkware linux build --github-actions [--app-img|--debian|--rpm]
arkware linux --help
```

Reads `arkware.config.js`, writes the C shell's own `arkware.config`
(a flat `KEY=value` file — a different format from and different file
than this package's `arkware.config.js`) from `spa.targetUrl` /
`spa.displayName` / `spa.nagHideSelectors` / `spa.nagHideTextMatches`,
copies the vendored `linux-project` source into
`platforms.linux.outDir`, runs `cmake -S . -B build` +
`cmake --build build` there, then packages the resulting binary.
Requires `spa.targetUrl` and `platforms.linux.enabled: true` (defaults
to `false` — see
[`linux-shell.md`](./linux-shell.md#why-platformslinuxenabled-defaults-to-false)).

Needs `cmake`, `pkg-config`, and GTK3/WebKitGTK dev packages on
`PATH` to build, plus one of `appimagetool`/`dpkg-deb`/`rpmbuild` to
package (see [`linux-shell.md`](./linux-shell.md#generate--build--package)
for what each format needs). `--github-actions` needs none of that
locally — it writes a CI workflow that installs everything itself.

On success, the packaged file is at
`<platforms.linux.outDir>/dist/`.

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--config <path>` | `./arkware.config.js` | Config file to load |
| `--app-img` | *(default)* | Package as an `.AppImage` |
| `--debian` | — | Package as a `.deb` |
| `--rpm` | — | Package as an `.rpm` |
| `--github-actions` | off | Write `.github/workflows/arkware-linux-build.yml` instead of building locally |
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
- **`needs \`appimagetool\`/\`dpkg-deb\`/\`rpmbuild\` on PATH`** (from
  `arkware linux build`) — install the tool the error names for the
  format you asked for (or none was asked for, so it's AppImage's
  `appimagetool`), or use `--github-actions` to build in CI instead,
  which installs all three itself.
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
- **`vendor/main/android-project is missing`** (from `arkware android
  build`/`spa-native`) — run `npm run sync`; if that still comes up
  empty, the pinned ref predates the full `android-project` vendoring
  and the pin needs bumping first — see
  [`sync-and-versioning.md`](./sync-and-versioning.md).
- **`Unknown command`** / **`Unknown subcommand`** — `android build`,
  `android spa-native`, `android flavor-snippet`, and `linux build`
  are the commands that do real work. `android spa-shell` is
  recognized but prints a "not supported yet" message (see
  [`android-flavor.md`](./android-flavor.md) and
  [`PROPOSAL-spa-shell-and-spa-native.md`](./PROPOSAL-spa-shell-and-spa-native.md))
  rather than the generic unknown-subcommand error. `arkware --help`
  (or `arkware <command> --help`) lists what's actually available.
