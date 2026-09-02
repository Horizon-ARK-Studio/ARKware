# CLI reference

Both binaries are installed by `npm install` (via `package.json`'s
`bin` field) and are thin wrappers around
[Neutralino](https://neutralino.js.org)'s `neu build`. Neither talks
to the network beyond what `neu build` itself does; `neu` must
already be on `PATH`.

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

---

## Common failure modes

- **`neu: command not found`** — install the [Neutralino CLI](https://neutralino.js.org)
  and confirm it's on `PATH`; neither CLI vendors it.
- **`arkware-shell: ...` / `arkware-spa: ...` error text** — both
  binaries catch thrown errors from config loading or scaffolding and
  print `<bin-name>: <message>` before exiting 1; the message
  itself names the missing/invalid field.
- **No `arkware.config.js` found** — pass `--config <path>` or copy
  [`arkware.config.example.js`](../arkware.config.example.js) to your
  project root first (see [`getting-started.md`](./getting-started.md)).
