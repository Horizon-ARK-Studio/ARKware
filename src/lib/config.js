"use strict";

const path = require("path");
const fs = require("fs");

/**
 * @typedef {Object} ArkwareConfig
 * @property {Object} spa
 * @property {string} spa.targetUrl
 * @property {string} spa.displayName
 * @property {string[]} [spa.nagHideSelectors]
 * @property {string[]} [spa.nagHideTextMatches]
 * @property {Object} app
 * @property {string} app.id
 * @property {string} app.version
 * @property {string} [app.icon]
 * @property {Object} platforms
 * @property {Object} [platforms.android]
 * @property {boolean} platforms.android.enabled
 * @property {string} platforms.android.flavor
 * @property {string} platforms.android.outDir
 * @property {Object} [platforms.android.bundledAssets]
 * @property {boolean} platforms.android.bundledAssets.enabled
 * @property {string} [platforms.android.bundledAssets.assetsDir]
 * @property {Object} [platforms.linux]
 * @property {boolean} platforms.linux.enabled
 * @property {string} platforms.linux.outDir
 */

const DEFAULTS = {
  spa: {
    nagHideSelectors: [],
    nagHideTextMatches: [],
  },
  platforms: {
    android: {
      outDir: "./arkware-dist/android",
      // Off by default. When enabled, `arkware android` (once the
      // spa-native CLI path lands -- see
      // docs/PROPOSAL-spa-shell-and-spa-native.md) copies
      // bundledAssets.assetsDir into the scaffolded project's
      // app/src/main/assets/ and points the generated flavor's
      // TARGET_URL at file:///android_asset/index.html instead of a
      // live URL. Library-level support (src/lib/android.js's
      // scaffold()) exists ahead of that CLI wiring so the two land
      // independently -- this flag has no effect on `arkware android
      // build` (the Gradle-flavor-authoring path) today.
      bundledAssets: {
        enabled: false,
      },
    },
    // Off by default -- needs system GTK3/WebKitGTK dev packages +
    // cmake on PATH; opt in once that toolchain is installed. This
    // is the only desktop target this package (or main) ships right
    // now -- Windows/macOS are "not yet staged" per main's ROADMAP.md.
    linux: {
      enabled: false,
      outDir: "./arkware-dist/linux",
    },
  },
};

/**
 * Finds and loads arkware.config.js, merging in defaults for
 * anything optional. Throws a plain, CLI-friendly Error (no stack
 * trace expected to be shown) for anything required that's missing.
 *
 * @param {string} [configPath] explicit path, else cwd/arkware.config.js
 * @returns {ArkwareConfig}
 */
function loadConfig(configPath) {
  const resolved = path.resolve(
    process.cwd(),
    configPath || "arkware.config.js"
  );

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `No arkware.config.js found at ${resolved}.\n` +
        `Copy arkware.config.example.js from @horizon-ark-studio/arkware to ` +
        `arkware.config.js at your project root and edit it, or pass --config <path>.`
    );
  }

  // Config is plain CommonJS on purpose -- no custom loader/parser to
  // maintain, and it lets a config author use plain JS (env vars,
  // conditionals) same as any other *.config.js tool.
  delete require.cache[require.resolve(resolved)];
  const raw = require(resolved);

  const config = deepMerge(DEFAULTS, raw);

  assert(config.app && config.app.id, "app.id is required (reverse-DNS app id)");
  assert(config.app && config.app.version, "app.version is required");
  assert(
    config.spa && config.spa.displayName,
    "spa.displayName is required"
  );
  // spa.targetUrl is NOT validated here -- whether it's required
  // depends on *which* command is about to run (`android build` and
  // `linux build` need a live URL; `android spa-native` doesn't, and
  // decides that from a --assets CLI flag that isn't known yet at
  // config-load time). Each of those commands' own library function
  // (android.js's emitFlavorSnippet, linux.js's scaffold) asserts on
  // targetUrl itself, at the point it actually needs one.

  config.__configDir = path.dirname(resolved);
  if (config.app.icon) {
    config.app.icon = path.resolve(config.__configDir, config.app.icon);
  }

  return config;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override || {})) {
    const baseVal = base ? base[key] : undefined;
    const overrideVal = override[key];
    if (
      baseVal &&
      overrideVal &&
      typeof baseVal === "object" &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal)
    ) {
      out[key] = deepMerge(baseVal, overrideVal);
    } else {
      out[key] = overrideVal;
    }
  }
  return out;
}

module.exports = { loadConfig };
