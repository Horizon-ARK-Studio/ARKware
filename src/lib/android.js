"use strict";

const fs = require("fs");
const path = require("path");

/**
 * APKs are built by .github/workflows/android-build.yml on the
 * `main` branch, not by this CLI -- there's no Android SDK bundled
 * or assumed here. What this does is the config-authoring half of
 * that loop: turn arkware.config.js into the same shape of
 * productFlavors block android-project/app/build.gradle.kts already
 * hand-defines for the youtube/template flavors, so adding a new SPA
 * is "paste this in, push, let CI build it" instead of writing the
 * four BuildConfig fields by hand.
 *
 * @param {import('./config').ArkwareConfig} config
 * @returns {string} a Gradle (Kotlin DSL) productFlavors block
 */
function emitFlavorSnippet(config) {
  if (!config.platforms.android || !config.platforms.android.enabled) {
    throw new Error(
      "platforms.android.enabled is false (or android isn't configured) in arkware.config.js"
    );
  }

  const flavor = config.platforms.android.flavor;
  const nagSelectors = (config.spa.nagHideSelectors || []).join(",");
  const nagTextMatches = (config.spa.nagHideTextMatches || []).join(",");

  return `        // Generated from arkware.config.js by \`arkware-shell emit-android-flavor\`.
        // Paste this into productFlavors in android-project/app/build.gradle.kts,
        // then add "${flavor}" to the matrix in
        // .github/workflows/android-build.yml so CI builds it.
        create("${flavor}") {
            dimension = "spa"
            applicationIdSuffix = ".${flavor}"
            resValue("string", "app_name", "${escape(config.spa.displayName)}")
            buildConfigField("String", "TARGET_URL", "\\"${escape(config.spa.targetUrl || "")}\\"")
            buildConfigField("String", "SPA_DISPLAY_NAME", "\\"${escape(config.spa.displayName)}\\"")
            buildConfigField("String", "NAG_HIDE_SELECTORS", "\\"${escape(nagSelectors)}\\"")
            buildConfigField("String", "NAG_HIDE_TEXT_MATCHES", "\\"${escape(nagTextMatches)}\\"")
        }
`;
}

function escape(value) {
  return String(value).replace(/"/g, '\\"');
}

/** Writes the snippet to a file instead of just returning it. */
function writeFlavorSnippet(config, outPath) {
  const snippet = emitFlavorSnippet(config);
  const resolved = path.resolve(config.__configDir, outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, snippet);
  return resolved;
}

module.exports = { emitFlavorSnippet, writeFlavorSnippet };
