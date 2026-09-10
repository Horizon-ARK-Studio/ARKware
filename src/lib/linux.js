"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * This module doesn't scaffold a template into shape from parameters --
 * `main`'s v2 stage (docs/Foundational/ROADMAP.md) is a real native C
 * shell (GTK + WebKitGTK via webview.h), not a config-driven
 * generator. So the "scaffold" here is: copy the vendored source
 * (pulled in full by scripts/sync-from-main.js -- see its FILES map)
 * into platforms.linux.outDir, and write that shell's own config file
 * next to it. Building means literally invoking `cmake` against that
 * copied source, the same as a person would by hand per
 * linux-project/README.md on main.
 *
 * There's no Neutralino path in this package at all anymore -- main's
 * ROADMAP.md is explicit that desktop is "one native C shell per OS",
 * and this is that shell for Linux, the only desktop target either
 * main or this package ships right now.
 */
const VENDORED_LINUX_PROJECT = path.join(
  __dirname,
  "..",
  "..",
  "vendor",
  "main",
  "linux-project"
);

/**
 * Renders the C shell's own config format (a flat `KEY=value` file --
 * see linux-project/src/config/config.c on main) from the same
 * arkware.config.js fields android.js's emitFlavorSnippet reads too --
 * the same convention SpaConfig.kt uses on Android: one config
 * authored once, re-shaped per platform by this package.
 *
 * @param {import('./config').ArkwareConfig} config
 * @returns {string}
 */
function renderShellConfig(config) {
  const nagSelectors = (config.spa.nagHideSelectors || []).join(",");
  const nagTextMatches = (config.spa.nagHideTextMatches || []).join(",");

  return (
    `# Generated from arkware.config.js by \`arkware linux build\`.\n` +
    `# See linux-project/README.md on main for this file's format.\n` +
    `target_url=${config.spa.targetUrl || ""}\n` +
    `display_name=${config.spa.displayName}\n` +
    `nag_hide_selectors=${nagSelectors}\n` +
    `nag_hide_text_matches=${nagTextMatches}\n`
  );
}

/**
 * Copies the vendored linux-project source into
 * platforms.linux.outDir and writes its arkware.config there.
 *
 * @param {import('./config').ArkwareConfig} config
 * @returns {{outDir: string}}
 */
function scaffold(config) {
  if (!config.platforms.linux || !config.platforms.linux.enabled) {
    throw new Error(
      "platforms.linux.enabled is false (or unset) in arkware.config.js"
    );
  }

  if (!config.spa.targetUrl) {
    throw new Error(
      "spa.targetUrl is required in arkware.config.js for `arkware linux build` " +
        "-- the native C shell always points at a URL (see linux-project's " +
        "own README on main); there's no bundled-local-assets mode for Linux " +
        "yet (see docs/PROPOSAL-spa-shell-and-spa-native.md's Feature A, " +
        "which notes Linux would need no main code changes but isn't wired " +
        "up on this branch yet either)."
    );
  }

  if (!fs.existsSync(VENDORED_LINUX_PROJECT)) {
    throw new Error(
      "vendor/main/linux-project is missing. Run `npm run sync` to pull it " +
        "from the commit pinned in arkware-runtime.json -- if that still " +
        "comes up empty, the pinned ref predates v2's linux-project landing " +
        "on main and the pin needs bumping first (see docs/sync-and-versioning.md)."
    );
  }

  const outDir = path.resolve(
    config.__configDir,
    config.platforms.linux.outDir
  );

  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(VENDORED_LINUX_PROJECT, outDir);

  fs.writeFileSync(path.join(outDir, "arkware.config"), renderShellConfig(config));

  return { outDir };
}

/**
 * Runs `cmake -S . -B build` then `cmake --build build` in outDir --
 * the exact two commands linux-project/README.md documents for a
 * person building it by hand. Requires the system GTK3/WebKitGTK dev
 * packages `cmake` will look for via pkg-config; this function
 * doesn't install them -- same "spawn the real toolchain, don't
 * vendor or reimplement it" stance as the rest of this package.
 *
 * @param {string} outDir
 * @returns {boolean} true if both cmake steps exited 0
 */
function build(outDir) {
  const buildDir = path.join(outDir, "build");

  const configure = spawnSync(
    "cmake",
    ["-S", ".", "-B", "build", "-DCMAKE_BUILD_TYPE=Release"],
    { cwd: outDir, stdio: "inherit" }
  );
  if (configure.error && configure.error.code === "ENOENT") {
    throw new Error(
      "Could not find `cmake` on PATH. Install cmake, pkg-config, and the " +
        "GTK3/WebKitGTK dev packages (see linux-project/README.md's " +
        "Building section on main), then re-run `arkware linux build`."
    );
  }
  if (configure.status !== 0) {
    return false;
  }

  const build_ = spawnSync("cmake", ["--build", "build"], {
    cwd: outDir,
    stdio: "inherit",
  });
  if (build_.status !== 0) {
    return false;
  }

  console.log(`Built. Binary at ${path.join(buildDir, "arkware")}`);
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
    }
  }
}

module.exports = { scaffold, build, renderShellConfig };
