// arkware.config.js
//
// The single place a project using @horizon-ark-studio/arkware
// describes the SPA it wants shelled and the app identity to package
// it under -- same idea as android-project/app/build.gradle.kts's
// per-flavor values (TARGET_URL, SPA_DISPLAY_NAME,
// NAG_HIDE_SELECTORS, NAG_HIDE_TEXT_MATCHES), generalized so both
// `arkware android build` and `arkware linux build` read one
// config instead of two separately hand-maintained ones.
//
// Copy this file to arkware.config.js at your project root and edit
// it. Both commands look for arkware.config.js in the current
// working directory by default, or a path passed via --config.

/** @type {import('./src/lib/config').ArkwareConfig} */
module.exports = {
  // Everything about the target SPA itself.
  spa: {
    // Required. The live URL the native window (arkware linux build)
    // and the generated Android BuildConfig field
    // (arkware android build) both point at.
    targetUrl: "https://example.com",

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
    // Reverse-DNS id. Becomes the Android applicationIdSuffix (as
    // `.{platforms.android.flavor}` off of com.horizonarkstudio.arkware,
    // same convention the existing youtube/template flavors use).
    id: "com.example.exampleapp",
    version: "0.1.0",
    // Path to a square PNG/ICO, used as the window/app icon.
    icon: "./icon.png",
  },

  platforms: {
    // APKs are NOT built by this CLI -- per the repo root README,
    // Android packaging happens in GitHub Actions
    // (.github/workflows/android-build.yml on the `main` branch),
    // not on a contributor's machine. What this CLI *does* provide
    // is `arkware android build`, which turns this same
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

    // Consumed by `arkware linux build`. Off by default -- newer,
    // and requires system GTK3/WebKitGTK dev packages + cmake on
    // PATH -- opt in once you've got those installed. This scaffolds
    // and builds main's actual v2 native C shell (linux-project),
    // the only desktop target main ships right now; no other desktop
    // OS or shell technology is in the picture. See
    // docs/linux-shell.md for the full walkthrough.
    linux: {
      enabled: false,
      // Output directory the copied linux-project source (and its
      // own build/ dir) is written to.
      outDir: "./arkware-dist/linux",
    },
  },
};
