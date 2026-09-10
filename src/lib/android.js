"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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
 * `targetUrlOverride`, when passed, wins over config.spa.targetUrl --
 * scaffold()'s bundled-assets mode uses this to point the flavor at
 * the copied-in local site (file:///android_asset/index.html) instead
 * of a live URL, without emitFlavorSnippet needing to know *why* the
 * URL it was handed looks the way it does.
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {{targetUrlOverride?: string}} [opts]
 * @returns {string} a Gradle (Kotlin DSL) productFlavors block
 */
function emitFlavorSnippet(config, opts = {}) {
  if (!config.platforms.android || !config.platforms.android.enabled) {
    throw new Error(
      "platforms.android.enabled is false (or android isn't configured) in arkware.config.js"
    );
  }

  const flavor = config.platforms.android.flavor;
  const nagSelectors = (config.spa.nagHideSelectors || []).join(",");
  const nagTextMatches = (config.spa.nagHideTextMatches || []).join(",");

  if (opts.targetUrlOverride === undefined && !config.spa.targetUrl) {
    throw new Error(
      "spa.targetUrl is required in arkware.config.js for `arkware android " +
        "build` -- or use `arkware android spa-native` (with --assets or " +
        "platforms.android.bundledAssets) to bundle a local site instead of " +
        "pointing at a live URL."
    );
  }

  const targetUrl =
    opts.targetUrlOverride !== undefined
      ? opts.targetUrlOverride
      : config.spa.targetUrl || "";

  return `        // Generated from arkware.config.js by \`arkware android flavor-snippet\`.
        // Paste this into productFlavors in android-project/app/build.gradle.kts,
        // then add "${flavor}" to the matrix in
        // .github/workflows/android-build.yml so CI builds it.
        create("${flavor}") {
            dimension = "spa"
            applicationIdSuffix = ".${flavor}"
            resValue("string", "app_name", "${escape(config.spa.displayName)}")
            buildConfigField("String", "TARGET_URL", "\\"${escape(targetUrl)}\\"")
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

// Vendored by scripts/sync-from-main.js (see its FILES map) -- the
// full android-project tree, same "pull the real source in, don't
// reimplement or reproduce it" stance src/lib/linux.js already takes
// for linux-project. Before this, only app/build.gradle.kts was
// vendored, which was enough for emitFlavorSnippet() (a string, no
// filesystem target) but not for anything -- like bundled assets --
// that needs a real project tree with an app/src/main/assets/ to copy
// into.
const VENDORED_ANDROID_PROJECT = path.join(
  __dirname,
  "..",
  "..",
  "vendor",
  "main",
  "android-project"
);

const ASSETS_DEST = path.join("app", "src", "main", "assets");
const BUNDLED_TARGET_URL = "file:///android_asset/index.html";
const APP_BUILD_GRADLE = path.join("app", "build.gradle.kts");

/**
 * Inserts a productFlavors `create("...") { ... }` block into an
 * already-vendored app/build.gradle.kts, just before that block's
 * closing brace -- brace-counted from the first `{` after the
 * `productFlavors` keyword, not a fixed-string match against
 * android-project's current youtube/template flavors. Those two
 * flavors are real content on `main` that can change shape over time;
 * counting braces means this keeps working across a `npm run sync`
 * re-vendor as long as `productFlavors { ... }` exists at all, the
 * same assumption android-project's own README already documents for
 * a person editing this file by hand.
 *
 * @param {string} gradleSource contents of app/build.gradle.kts
 * @param {string} flavorSnippet output of emitFlavorSnippet()
 * @returns {string} gradleSource with the flavor spliced in
 */
function insertFlavorIntoGradle(gradleSource, flavorSnippet) {
  const keyword = "productFlavors";
  const keywordIdx = gradleSource.indexOf(keyword);
  if (keywordIdx === -1) {
    throw new Error(
      "app/build.gradle.kts has no `productFlavors` block -- vendored " +
        "android-project may be out of sync with what this package expects. " +
        "Try `npm run sync`."
    );
  }

  const openIdx = gradleSource.indexOf("{", keywordIdx);
  if (openIdx === -1) {
    throw new Error("Found `productFlavors` but no opening `{` after it");
  }

  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < gradleSource.length; i++) {
    if (gradleSource[i] === "{") depth++;
    else if (gradleSource[i] === "}") {
      depth--;
      if (depth === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  if (closeIdx === -1) {
    throw new Error("productFlavors block's closing `}` was never found (unbalanced braces)");
  }

  // Insert before the *start of the line* the closing brace sits on
  // (when it has one to itself, the normal case), not immediately
  // before the `}` character -- otherwise the closing line's own
  // leading indentation ends up prepended to flavorSnippet's first
  // line instead of preceding the `}` itself, which is
  // syntactically harmless in Kotlin but reads oddly.
  const lineStart = gradleSource.lastIndexOf("\n", closeIdx) + 1;
  const linePrefix = gradleSource.slice(lineStart, closeIdx);
  const insertIdx = /^\s*$/.test(linePrefix) ? lineStart : closeIdx;

  return (
    gradleSource.slice(0, insertIdx) +
    flavorSnippet +
    gradleSource.slice(insertIdx)
  );
}

/**
 * Copies the vendored android-project source into
 * platforms.android.outDir, and -- when
 * platforms.android.bundledAssets.enabled is set -- copies the user's
 * local site into that copy's app/src/main/assets/ so the shell can
 * load it with no live URL at all (Feature A of
 * docs/PROPOSAL-spa-shell-and-spa-native.md's spa-native mode).
 *
 * This does NOT invoke Gradle itself -- like linux.js's scaffold(),
 * compiling is a separate step (this module's own build(), called by
 * `arkware android build`/`spa-native` only when --build is passed).
 * CI (.github/workflows/android-build.yml on main) remains the actual
 * release path either way; a local `--build` is for testing the
 * scaffolded output, not for producing the APK main ships.
 *
 * @param {import('./config').ArkwareConfig} config
 * @returns {{outDir: string, assetsCopied: boolean, flavorSnippet: string}}
 */
function scaffold(config) {
  if (!config.platforms.android || !config.platforms.android.enabled) {
    throw new Error(
      "platforms.android.enabled is false (or android isn't configured) in arkware.config.js"
    );
  }

  if (!fs.existsSync(VENDORED_ANDROID_PROJECT)) {
    throw new Error(
      "vendor/main/android-project is missing. Run `npm run sync` to pull it " +
        "from the commit pinned in arkware-runtime.json -- if that still " +
        "comes up empty, the pinned ref predates the full android-project " +
        "vendoring and the pin needs bumping first (see docs/sync-and-versioning.md)."
    );
  }

  const outDir = path.resolve(
    config.__configDir,
    config.platforms.android.outDir
  );

  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(VENDORED_ANDROID_PROJECT, outDir);

  const bundled = config.platforms.android.bundledAssets;
  let assetsCopied = false;
  let targetUrlOverride;

  if (bundled && bundled.enabled) {
    if (!bundled.assetsDir) {
      throw new Error(
        "platforms.android.bundledAssets.enabled is true but " +
          "platforms.android.bundledAssets.assetsDir isn't set in " +
          "arkware.config.js -- point it at the local site's build output " +
          "(the directory containing index.html)."
      );
    }

    const assetsSrc = path.resolve(config.__configDir, bundled.assetsDir);
    if (!fs.existsSync(assetsSrc)) {
      throw new Error(`bundledAssets.assetsDir does not exist: ${assetsSrc}`);
    }
    if (!fs.existsSync(path.join(assetsSrc, "index.html"))) {
      throw new Error(
        `bundledAssets.assetsDir (${assetsSrc}) has no index.html -- ` +
          `${BUNDLED_TARGET_URL} needs one at the root of the copied assets.`
      );
    }

    const assetsDest = path.join(outDir, ASSETS_DEST);
    // The vendored project ships no assets/ directory of its own
    // (Android WebView apps normally don't need one), so this is
    // additive, not an overwrite of anything main's Kotlin reads --
    // same "just copy files in as-is" scope the proposal's Feature A
    // draws for spa-native.
    copyDir(assetsSrc, assetsDest);
    assetsCopied = true;
    targetUrlOverride = BUNDLED_TARGET_URL;
  }

  const flavorSnippet = emitFlavorSnippet(config, { targetUrlOverride });

  const gradlePath = path.join(outDir, APP_BUILD_GRADLE);
  const gradleSource = fs.readFileSync(gradlePath, "utf8");
  fs.writeFileSync(gradlePath, insertFlavorIntoGradle(gradleSource, flavorSnippet));

  return {
    outDir,
    assetsCopied,
    flavorSnippet,
    flavor: config.platforms.android.flavor,
  };
}

/**
 * Runs `./gradlew assemble<Flavor>Debug` in outDir -- the local
 * equivalent of what .github/workflows/android-build.yml does in CI,
 * now that scaffold() leaves outDir as a real, self-contained Gradle
 * project (vendored source + wrapper + the flavor already spliced
 * into app/build.gradle.kts) instead of just a snippet to hand-paste
 * into main's own checkout. CI remains the actual release path
 * (signing, the build matrix, etc.) -- this is for building/testing
 * the scaffolded output locally, the same relationship linux.js's
 * build() has to a person running `cmake` by hand.
 *
 * Requires a working Android SDK (ANDROID_HOME/local.properties) on
 * the machine running this -- same "spawn the real toolchain, don't
 * vendor or reimplement it" stance the rest of this package takes;
 * this function doesn't install or configure one.
 *
 * @param {string} outDir
 * @param {string} flavor matches config.platforms.android.flavor
 * @param {{buildType?: string}} [opts] buildType defaults to "Debug"
 * @returns {boolean} true if the gradlew invocation exited 0
 */
function build(outDir, flavor, opts = {}) {
  const buildType = opts.buildType || "Debug";
  const capitalizedFlavor = flavor.charAt(0).toUpperCase() + flavor.slice(1);
  const task = `assemble${capitalizedFlavor}${buildType}`;
  const isWindows = process.platform === "win32";
  // NOT path.join(".", "gradlew") -- that normalizes away the leading
  // "./", and spawnSync then searches PATH instead of cwd for a bare
  // "gradlew", which is not on PATH and fails with ENOENT even though
  // the script sits right there in outDir. The explicit "./" prefix
  // (POSIX) is what tells exec to resolve it relative to cwd.
  const gradlew = isWindows ? "gradlew.bat" : "./gradlew";

  const result = spawnSync(gradlew, [task], {
    cwd: outDir,
    stdio: "inherit",
    shell: isWindows,
  });

  if (result.error && result.error.code === "ENOENT") {
    throw new Error(
      `Could not run ${gradlew} in ${outDir}. This needs a JDK on PATH and ` +
        "a configured Android SDK (ANDROID_HOME or outDir/local.properties) " +
        "-- gradlew itself will download Gradle on first run, but not the SDK."
    );
  }
  if (result.status !== 0) {
    return false;
  }

  console.log(
    `Built. Look under ${path.join(outDir, "app", "build", "outputs", "apk", flavor)} for the APK.`
  );
  return true;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fs.chmodSync(destPath, fs.statSync(srcPath).mode);
    }
  }
}

module.exports = { emitFlavorSnippet, writeFlavorSnippet, scaffold, build };
