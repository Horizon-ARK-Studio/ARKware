"use strict";

const path = require("path");
const fs = require("fs");

/**
 * @typedef {Object} ArkwareConfig
 * @property {Object} spa
 * @property {string} [spa.targetUrl]
 * @property {string} [spa.buildDir]
 * @property {string} spa.displayName
 * @property {string[]} [spa.nagHideSelectors]
 * @property {string[]} [spa.nagHideTextMatches]
 * @property {Object} app
 * @property {string} app.id
 * @property {string} app.version
 * @property {string} [app.icon]
 * @property {Object} platforms
 * @property {Object} platforms.desktop
 * @property {boolean} platforms.desktop.enabled
 * @property {string} platforms.desktop.outDir
 * @property {Object} [platforms.android]
 * @property {boolean} platforms.android.enabled
 * @property {string} platforms.android.flavor
 */

const DEFAULTS = {
  spa: {
    nagHideSelectors: [],
    nagHideTextMatches: [],
  },
  platforms: {
    desktop: {
      enabled: true,
      outDir: "./arkware-dist/desktop",
    },
  },
};

/**
 * Finds and loads arkware.config.js, merging in defaults for
 * anything optional. Throws a plain, CLI-friendly Error (no stack
 * trace expected to be shown) for anything required that's missing.
 *
 * @param {string} [configPath] explicit path, else cwd/arkware.config.js
 * @param {"shell"|"spa"} mode which CLI is asking -- determines which
 *   spa.* field is required
 * @returns {ArkwareConfig}
 */
function loadConfig(configPath, mode) {
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

  if (mode === "shell") {
    assert(
      config.spa.targetUrl,
      "spa.targetUrl is required for arkware-shell (the URL the native window points at)"
    );
  }
  if (mode === "spa") {
    assert(
      config.spa.buildDir,
      "spa.buildDir is required for arkware-spa (path to the SPA's built static output)"
    );
    const buildDirAbs = path.resolve(path.dirname(resolved), config.spa.buildDir);
    assert(
      fs.existsSync(buildDirAbs),
      `spa.buildDir (${config.spa.buildDir}) does not exist -- build your SPA first`
    );
    config.spa.buildDir = buildDirAbs;
  }

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
