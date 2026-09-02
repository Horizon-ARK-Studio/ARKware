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
Android Gradle flavor shape) from `main`, over local git or a
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

## Two CLIs

Both are thin wrappers around [Neutralino](https://neutralino.js.org)
(`neu build`) — same window-mode shell the root README's platform
table describes for desktop, just invoked from Node instead of by
hand.

### `arkware-shell` — native window, live URL

Points a real, native desktop window straight at a URL. The window
chrome is native; the content is whatever the live SPA serves — the
same shell/content split as ARKware's Android WebView shell, one
platform over.

```
arkware-shell build
```

Reads `spa.targetUrl` out of `arkware.config.js` in the current
directory (see below), scaffolds a Neutralino project, and runs
`neu build`.

### `arkware-spa` — offline app, bundled build

For when you own the SPA and want it to run with no network
dependency on the original site at all: copies `spa.buildDir` (your
SPA's own build output, e.g. `dist/`) into the native app and serves
it locally.

```
arkware-spa build
```

## `arkware.config.js`

The single file both CLIs read — everything they need to know to
package your SPA. Copy
[`arkware.config.example.js`](arkware.config.example.js) to
`arkware.config.js` at your project root and edit it:

```js
module.exports = {
  spa: {
    targetUrl: "https://example.com",   // arkware-shell
    buildDir: "./dist",                  // arkware-spa
    displayName: "Example App",
  },
  app: {
    id: "com.example.exampleapp",
    version: "0.1.0",
    icon: "./icon.png",
  },
  platforms: {
    desktop: { enabled: true, outDir: "./arkware-dist/desktop" },
    android: { enabled: true, flavor: "exampleapp" },
  },
};
```

See the comments in `arkware.config.example.js` for the full field
list, including `spa.nagHideSelectors`/`spa.nagHideTextMatches` (same
purpose as `SpaConfig.kt`'s fields on the Android side: hiding an
"open our app" nag banner, if the SPA has one).

## Android packaging

Neither CLI builds an APK — that stays a CI job
([`.github/workflows/android-build.yml`](https://github.com/Horizon-ARK-Studio/ARKware/blob/main/.github/workflows/android-build.yml)
on `main`), on purpose: no Android SDK is bundled or assumed here.
What this package gives you is the config-authoring half of that
loop:

```
arkware-shell emit-android-flavor
```

turns the same `arkware.config.js` into a Gradle product-flavor
snippet shaped like the existing `youtube`/`template` flavors in
`android-project/app/build.gradle.kts` — paste it in, add the flavor
name to the CI matrix, push, and CI builds the APK.

## License

[GPL-3.0-or-later](LICENSE), same as the rest of ARKware. The
`LICENSE` file in this branch is kept in sync from `main` by
`scripts/sync-from-main.js` rather than copied by hand.
