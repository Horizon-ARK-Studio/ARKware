// arkware.config.js
//
// The single place a project using @horizon-ark-studio/arkware
// describes the SPA it wants shelled and the app identity to package
// it under -- same idea as android-project/app/build.gradle.kts's
// per-flavor values (TARGET_URL, SPA_DISPLAY_NAME,
// NAG_HIDE_SELECTORS, NAG_HIDE_TEXT_MATCHES), generalized so both
// `arkware-shell` and `arkware-spa` (and, later, the Android flavor
// emitted for CI) read one config instead of three separately
// hand-maintained ones.
//
// Copy this file to arkware.config.js at your project root and edit
// it. Both CLIs look for arkware.config.js in the current working
// directory by default, or a path passed via --config.

/** @type {import('./src/lib/config').ArkwareConfig} */
module.exports = {
  // Everything about the target SPA itself.
  spa: {
    // Required by `arkware-shell`: the live URL the native window
    // points at. Not used by `arkware-spa`.
    targetUrl: "https://example.com",

    // Required by `arkware-spa`: a local directory containing the
    // SPA's already-built static output (e.g. `dist/`, `build/`) to
    // bundle into the app so it runs offline. Not used by
    // `arkware-shell`.
    buildDir: "./dist",

    // Shown in window titles, the Android media notification's
    // subtitle/artist field, and generated app metadata.
    displayName: "Example App",

    // Same purpose as SpaConfig.kt's nagHideSelectors/nagHideTextMatches
    // on Android: an "open our app" nag banner to hide, if the SPA has
    // one. Left empty means "don't try" rather than inheriting
    // someone else's selectors.
    nagHideSelectors: [],
    nagHideTextMatches: [],
  },

  // App identity, shared across every platform this config packages
  // for.
  app: {
    // Reverse-DNS id. Becomes the Neutralino applicationId and the
    // Android applicationIdSuffix (as `.{platforms.android.flavor}`
    // off of com.horizonarkstudio.arkware, same convention the
    // existing youtube/template flavors use).
    id: "com.example.exampleapp",
    version: "0.1.0",
    // Path to a square PNG/ICO, used as the window/app icon.
    icon: "./icon.png",
  },

  platforms: {
    // Consumed by both `arkware-spa build` and `arkware-shell build`.
    // `neu` (the Neutralino CLI, https://neutralino.js.org) must
    // already be installed -- these CLIs shell out to it rather than
    // vendoring it.
    desktop: {
      enabled: true,
      // Output directory the scaffolded Neutralino project (and
      // `neu build`'s own dist/) is written to.
      outDir: "./arkware-dist/desktop",
    },

    // APKs are NOT built by these CLIs -- per the repo root README,
    // Android packaging happens in GitHub Actions
    // (.github/workflows/android-build.yml on the `main` branch),
    // not on a contributor's machine. What these CLIs *do* provide
    // is `arkware-shell emit-android-flavor`, which turns this same
    // config into a Gradle product-flavor snippet
    // (android-project/app/build.gradle.kts's productFlavors block)
    // ready to paste in and push, so CI picks it up. See this repo's
    // README for the full loop.
    android: {
      enabled: true,
      // Flavor name -- becomes applicationIdSuffix `.<flavor>` and
      // the matrix entry android-build.yml needs added for it.
      flavor: "exampleapp",
    },
  },
};
