# Android packaging: config → Gradle flavor → CI build

Neither `arkware-shell` nor `arkware-spa` builds an APK, on purpose:
no Android SDK is bundled or assumed in this package. Android
packaging stays a CI job on `main`
([`.github/workflows/android-build.yml`](https://github.com/Horizon-ARK-Studio/ARKware/blob/main/.github/workflows/android-build.yml)).
What this package provides is the **config-authoring half** of that
loop — turning `arkware.config.js` into the Gradle snippet CI needs.

## Generate the snippet

```
arkware-shell emit-android-flavor [--config <path>] [--out <path>]
```

Requires, in `arkware.config.js`:

- `platforms.android.enabled: true`
- `platforms.android.flavor` — the flavor name
- `app.id` — becomes `applicationIdSuffix` of `.{flavor}` off
  `com.horizonarkstudio.arkware`
- `app.version`
- `spa.displayName`, and optionally `spa.nagHideSelectors` /
  `spa.nagHideTextMatches`

Writes a product-flavor block shaped like the existing
`youtube`/`template` flavors already in
`android-project/app/build.gradle.kts` on `main`, to
`./arkware-android-flavor.gradle.kts` by default (override with
`--out`).

## Wire it into `main`

1. Open the generated file and paste its contents into the
   `productFlavors` block of
   `android-project/app/build.gradle.kts` on `main`.
2. Add the new flavor name to the build matrix in
   `.github/workflows/android-build.yml`.
3. Push. CI builds the APK for the new flavor.

This package does not open that pull request or push to `main` for
you — it only produces the snippet. The rest is a normal `main`-branch
change reviewed like any other.

## Why the split

Keeping APK builds out of this package means:

- No Android SDK / NDK weight added to `npm install`.
- Contributors packaging a SPA don't need Android tooling locally at
  all — only `neu` for the desktop CLIs.
- The actual build environment (CI) is the one source of truth for
  what an APK looks like, rather than "works on my machine" Gradle
  state living in a dependency.

See also [`config-reference.md`](./config-reference.md) for the full
`platforms.android` field list, and the root
[README](../README.md#android-packaging) for the same summary in
context with the rest of the package.
