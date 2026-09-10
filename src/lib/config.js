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
  assert(
    config.spa && config.spa.targetUrl,
    "spa.targetUrl is required -- the live URL both `arkware android build` " +
      "(as TARGET_URL) and `arkware linux build` (as the window's target) point at"
  );

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
