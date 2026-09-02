"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "neutralino",
  "neutralino.config.template.json"
);

/**
 * Writes a neutralino.config.json + resources/ into config's
 * platforms.desktop.outDir, in one of two shapes:
 *
 * - "shell": documentRoot/resources stay minimal (icon only); `url`
 *   points straight at spa.targetUrl. The native window is real, the
 *   content inside it is whatever the live SPA serves -- same shell/
 *   content split as the Android WebView shell, just via Neutralino's
 *   OS-native webview instead of WebView. No local server needed
 *   since nothing local is served.
 * - "spa": documentRoot/resources are the SPA's own build output
 *   (spa.buildDir, copied in full), served locally by Neutralino's
 *   built-in server so the app runs fully offline.
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {"shell"|"spa"} mode
 */
function scaffold(config, mode) {
  const outDir = path.resolve(
    config.__configDir,
    config.platforms.desktop.outDir
  );
  const resourcesDir = path.join(outDir, "resources");

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(resourcesDir, { recursive: true });

  if (mode === "spa") {
    copyDir(config.spa.buildDir, resourcesDir);
  } else {
    // Shell mode: resources/ only needs to exist for `neu build` to
    // have something to package alongside the binary (e.g. the icon
    // below); the page itself is never served locally.
    fs.writeFileSync(
      path.join(resourcesDir, ".gitkeep"),
      "# resources/ intentionally near-empty in shell mode -- see src/lib/neutralino.js\n"
    );
  }

  let iconRelPath = "";
  if (config.app.icon && fs.existsSync(config.app.icon)) {
    const iconDir = path.join(resourcesDir, "icons");
    fs.mkdirSync(iconDir, { recursive: true });
    const iconFile = path.join(iconDir, "appIcon" + path.extname(config.app.icon));
    fs.copyFileSync(config.app.icon, iconFile);
    iconRelPath = "/resources/icons/" + path.basename(iconFile);
  }

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const filled = template
    .replace(/__APP_ID__/g, config.app.id)
    .replace(/__APP_VERSION__/g, config.app.version)
    .replace(/__WINDOW_TITLE__/g, config.spa.displayName)
    .replace(/__BINARY_NAME__/g, slugify(config.spa.displayName))
    .replace(/__ICON__/g, iconRelPath)
    .replace(
      /__DOCUMENT_ROOT__/g,
      mode === "spa" ? "/resources/" : "/resources/"
    )
    .replace(/__URL__/g, mode === "spa" ? "/" : config.spa.targetUrl)
    .replace(/__ENABLE_SERVER__/g, mode === "spa" ? "true" : "false");

  fs.writeFileSync(path.join(outDir, "neutralino.config.json"), filled);

  return { outDir };
}

/**
 * Runs `neu build` in outDir. Requires the Neutralino CLI (`neu`) to
 * already be on PATH, or reachable via `npx --yes @neutralinojs/neu`
 * as a fallback -- this package deliberately doesn't vendor it.
 */
function build(outDir) {
  const attempts = [
    { cmd: "neu", args: ["build"] },
    { cmd: "npx", args: ["--yes", "@neutralinojs/neu", "build"] },
  ];

  for (const attempt of attempts) {
    const result = spawnSync(attempt.cmd, attempt.args, {
      cwd: outDir,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.error && result.error.code === "ENOENT") {
      continue; // try the next fallback
    }
    return result.status === 0;
  }

  throw new Error(
    "Could not find `neu` (Neutralino CLI) on PATH, and `npx @neutralinojs/neu` " +
      "also failed. Install it with `npm install -g @neutralinojs/neu` and try again."
  );
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

function slugify(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "arkware-app"
  );
}

module.exports = { scaffold, build };
