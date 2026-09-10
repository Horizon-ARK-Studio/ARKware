# Android packaging: config → local scaffold → (optional local build) / CI build

## Scaffold a real local project

```
arkware android build [--config <path>] [--assets <path>] [--build]
```

Same shape as `arkware linux build`: copies the full vendored
`android-project` tree into `platforms.android.outDir` and splices a
product-flavor block into its `app/build.gradle.kts`, shaped like the
existing `youtube`/`template` flavors already there on `main`. This
works the same way regardless of what the flavor points at:

- **Live URL** — leave `platforms.android.bundledAssets` unset (and
  don't pass `--assets`). The flavor's `TARGET_URL` is
  `spa.targetUrl`.
- **Bundled local assets** — pass `--assets <path>` (a directory
  containing `index.html`), or set
  `platforms.android.bundledAssets = { enabled: true, assetsDir: '...' }`
  in `arkware.config.js`. Those files are copied into
  `app/src/main/assets/`, and the flavor's `TARGET_URL` becomes
  `file:///android_asset/index.html` — no live URL, no network needed.
  `arkware android spa-native` is the same command with this mode
  required (it errors if no assets are given).

Requires, in `arkware.config.js`:

- `platforms.android.enabled: true`
- `platforms.android.flavor` — the flavor name
- `app.id` — becomes `applicationIdSuffix` of `.{flavor}` off
  `com.horizonarkstudio.arkware`
- `app.version`
- `spa.displayName`, and optionally `spa.nagHideSelectors` /
  `spa.nagHideTextMatches`
- `spa.targetUrl` — required unless bundling local assets instead

Requires `vendor/main/android-project` to be present (run `npm run
sync` first if it isn't).

## Building it

By default, `build`/`spa-native` only scaffold — no Android SDK is
required. Pass `--build` to also run
`./gradlew assemble<Flavor>Debug` in the scaffolded project locally
(needs a JDK and a configured Android SDK on `PATH`), or do it by hand
later:

```
cd <platforms.android.outDir> && ./gradlew assemble<Flavor>Debug
```

CI (`.github/workflows/android-build.yml` on `main`) remains the
actual release path — it builds from `main`'s own checkout, not from
this scaffolded copy. A local `--build` is for testing the scaffolded
output, not for producing the APK `main` ships.

## Getting a flavor built by CI

CI builds flavors that exist in `android-project/app/build.gradle.kts`
on `main`, not from a local scaffold. To get a new flavor built there:

```
arkware android flavor-snippet [--config <path>] [--out <path>]
```

This is the config-authoring-only path (no local scaffold at all):
it writes just the product-flavor block to
`./arkware-android-flavor.gradle.kts` by default (override with
`--out`).

1. Open the generated file and paste its contents into the
   `productFlavors` block of
   `android-project/app/build.gradle.kts` on `main`.
2. Add the new flavor name to the build matrix in
   `.github/workflows/android-build.yml`.
3. Push. CI builds the APK for the new flavor.

This package does not open that pull request or push to `main` for
you — it only produces the snippet. The rest is a normal `main`-branch
change reviewed like any other.

See also [`config-reference.md`](./config-reference.md) for the full
`platforms.android` field list, and the root
[README](../README.md#android-packaging) for the same summary in
context with the rest of the package.
