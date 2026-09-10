# @horizon-ark-studio/arkware

npm packaging + CLIs for [ARKware](https://github.com/Horizon-ARK-Studio/ARKware)
("`ARKware`", case-sensitive, is the project's name; the npm registry
itself doesn't allow uppercase package names, hence the scoped,
lowercase `@horizon-ark-studio/arkware`).

## Where the code actually lives

`main` is the one canonical ARKware implementation — the Android app,
the design docs, the license. This branch is not a second copy of
that; it's an **ecosystem-specific distribution layer**: npm package
metadata plus a CLI that knows how to obtain and expose the runtime
`main` defines. The same shape could exist for other ecosystems later
(a PyPI branch for a Python/ARKlight integration, a Maven branch for
Gradle/Android tooling) without any of them needing to understand the
whole project — each just needs enough to obtain and repackage it for
its own ecosystem.

Concretely, `npm install` on this package does:

```
npm install
  -> this package (npm branch)
  -> scripts/sync-from-main.js retrieves the pinned ARKware commit from main
  -> installs/assembles it locally
  -> done
```

This branch doesn't merge from `main` via pull request; instead
[`scripts/sync-from-main.js`](scripts/sync-from-main.js) pulls the
handful of files this package depends on (LICENSE, README, the
Android Gradle flavor shape, and the native Linux shell source under
`linux-project`) from `main`, over local git or a
`raw.githubusercontent.com` link when there's no local git to use.

### Version pin

[`arkware-runtime.json`](arkware-runtime.json) pins the *exact* `main`
commit `sync-from-main.js` reads from — a fixed SHA (or, once `main`
starts tagging releases, a tag), not a moving `main` HEAD. Without
this, a published npm package can end up silently pointed at
whatever `main` looks like on the day someone happens to run
`npm install`, which is how you get "npm package from yesterday +
main from today" bugs that are miserable to trace back. Bumping the
runtime a package depends on is a deliberate act: edit `ref` in
`arkware-runtime.json`, run `npm run sync`, verify the CLIs still work
against the new content, then commit it — see that file's own notes
for the full loop.

```
npm install @horizon-ark-studio/arkware
```

## One CLI, two commands

`arkware` is the only binary this package installs. There's no
Neutralino anywhere in it — `main` settled on one native C shell per
desktop OS, and this branch tracks that.

### `arkware linux build` — real native shell, GTK + WebKitGTK, packaged

Scaffolds `main`'s actual v2 desktop shell source (`linux-project`)
into `platforms.linux.outDir`, runs `cmake` directly against it —
the same two commands (`cmake -S . -B build`, `cmake --build build`)
a person would run by hand — and packages the result into an
`.AppImage` (default), `.deb`, or `.rpm`. Needs `cmake`,
`pkg-config`, and GTK3/WebKitGTK dev packages on `PATH` either way,
plus whichever packaging tool the chosen format needs. Off by
default — set `platforms.linux.enabled: true` in `arkware.config.js`
to use it.

```
arkware linux build                 # AppImage
arkware linux build --debian
arkware linux build --rpm
arkware linux build --github-actions  # write a CI workflow instead
```

Full walkthrough: [`docs/linux-shell.md`](docs/linux-shell.md).

### `arkware android build` — full local Android scaffold

Scaffolds the full vendored `android-project` tree into
`platforms.android.outDir` and splices a Gradle product-flavor block
into its `build.gradle.kts` — the same thing `arkware linux build`
does for the Linux shell, working the same way whether the flavor
points at a live URL or bundles a local site's files (`--assets`).
Doesn't run Gradle unless you pass `--build`.

```
arkware android build
arkware android build --assets ./dist   # bundle a local site instead
```

CI (`.github/workflows/android-build.yml` on `main`) remains the
actual release path; to get a locally-scaffolded flavor built there
too, run `arkware android flavor-snippet` and paste its output into
`main`'s own checkout.

Full walkthrough: [`docs/android-flavor.md`](docs/android-flavor.md).

## `arkware.config.js`

The single file both commands read — everything they need to know to
package your SPA. Copy
[`arkware.config.example.js`](arkware.config.example.js) to
`arkware.config.js` at your project root and edit it:

```js
module.exports = {
  spa: {
    targetUrl: "https://example.com",
    displayName: "Example App",
  },
  app: {
    id: "com.example.exampleapp",
    version: "0.1.0",
    icon: "./icon.png",
  },
  platforms: {
    android: { enabled: true, flavor: "exampleapp" },
    linux: { enabled: false, outDir: "./arkware-dist/linux" },
  },
};
```

See the comments in `arkware.config.example.js` for the full field
list, including `spa.nagHideSelectors`/`spa.nagHideTextMatches` (same
purpose as `SpaConfig.kt`'s fields on the Android side: hiding an
"open our app" nag banner, if the SPA has one).

## Android packaging

```
arkware android build
```

scaffolds the same `arkware.config.js` into a full local
`android-project` copy — a real, self-contained Gradle project with
the new flavor already spliced into `build.gradle.kts` — regardless of
whether that flavor points at a live URL or bundles a local site's
assets. No Android SDK is required for that scaffold step; pass
`--build` if you also want it compiled locally (needs a JDK +
configured Android SDK on `PATH`).

The actual release APK still comes from CI
([`.github/workflows/android-build.yml`](https://github.com/Horizon-ARK-Studio/ARKware/blob/main/.github/workflows/android-build.yml)
on `main`), which builds from `main`'s own checkout, not from this
local scaffold. To get a flavor built there too, run
`arkware android flavor-snippet` to get just the Gradle snippet, paste
it into `android-project/app/build.gradle.kts` on `main`, add the
flavor name to the CI matrix, and push.

## Publishing

CI publishes via npm Trusted Publishing (OIDC) — see
[`.github/workflows/npm-publish.yml`](.github/workflows/npm-publish.yml).
No `NPM_TOKEN` is stored in this repo; the workflow exchanges its GitHub
Actions OIDC identity for a short-lived publish credential, matched
against the Trusted Publisher entry configured on the package at
npmjs.com (org `Horizon-ARK-Studio`, repo `ARKware`, workflow
`npm-publish.yml`).

npm cannot attach a Trusted Publisher to a package that doesn't exist
yet, so this only works because a one-time manual bootstrap publish
already happened:

```
npm login
npm publish --access public
```

That step is already done for `@horizon-ark-studio/arkware` — it does
not need to be repeated. It would only apply again if publishing under
a brand-new, never-before-published package name.

## License

[GPL-3.0-or-later](LICENSE), same as the rest of ARKware. The
`LICENSE` file in this branch is kept in sync from `main` by
`scripts/sync-from-main.js` rather than copied by hand.
