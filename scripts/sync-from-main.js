#!/usr/bin/env node
"use strict";

/**
 * The `npm` branch doesn't merge from `main` via pull request -- the
 * code that actually *is* ARKware (the Android shell, the docs, the
 * license) only ever lives on `main`. This script is the link that
 * pulls the handful of files the npm package needs to build its own
 * dependency on that content, instead of hand-copying them (and
 * silently drifting) or merging two branches that serve genuinely
 * different purposes (a publishable package vs. the shell source).
 *
 * Which commit "main's contents" means is not `main`'s moving HEAD --
 * it's whatever arkware-runtime.json's `ref` says. Floating on HEAD
 * is exactly how you get "npm package from yesterday + main from
 * today" mismatches; pinning a commit (or, once main starts tagging
 * releases, a tag) means this package only ever picks up a runtime
 * change when someone deliberately bumps the pin, reviews what came
 * across, and commits it. See arkware-runtime.json for how to do that.
 *
 * Two ways to reach that commit's contents, tried in order:
 *   1. Local git -- if this checkout can resolve the pinned ref (the
 *      common case: same clone, two branches, or main's history was
 *      fetched), read the blob straight out of git. No network needed.
 *   2. A raw.githubusercontent.com URL against the pinned ref -- used
 *      when only the `npm` branch is checked out (a shallow/
 *      single-branch CI checkout, or `npm install` from git with no
 *      local main history).
 *
 * Re-run with `npm run sync` after bumping arkware-runtime.json's
 * `ref`. It also runs automatically as `prepare`, against whatever
 * ref is currently pinned.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const REPO = "Horizon-ARK-Studio/ARKware";
const REF = readPinnedRef();
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${REF}/`;

function readPinnedRef() {
  const pinPath = path.resolve(__dirname, "..", "arkware-runtime.json");
  try {
    const pin = JSON.parse(fs.readFileSync(pinPath, "utf8"));
    if (!pin.ref) throw new Error("arkware-runtime.json has no `ref` field");
    return pin.ref;
  } catch (err) {
    console.warn(
      `sync-from-main: couldn't read a pinned ref from arkware-runtime.json (${err.message}); ` +
        `falling back to 'main' HEAD. This means content can drift between syncs -- see arkware-runtime.json.`
    );
    return "main";
  }
}

// path on main -> path in this package
const FILES = {
  "LICENSE": "LICENSE",
  "README.md": "vendor/main/README.md",
  "docs/Foundational/PROBLEM-STATEMENT.md": "vendor/main/PROBLEM-STATEMENT.md",
  // Full android-project tree, one path per entry (same shape as
  // linux-project below) -- needed so `arkware android` has an actual
  // buildable project on disk to scaffold into, the way
  // src/lib/linux.js's scaffold() already does for Linux. Previously
  // only app/build.gradle.kts was vendored, which was enough for
  // emitFlavorSnippet() (a Gradle-snippet string, no filesystem
  // target) but not for anything that needs to copy files *into* a
  // real Android project tree -- e.g. spa-native's bundled-assets
  // mode, which needs app/src/main/assets/ to exist somewhere local.
  "android-project/app/build.gradle.kts": "vendor/main/android-project/app/build.gradle.kts",
  "android-project/app/proguard-rules.pro": "vendor/main/android-project/app/proguard-rules.pro",
  "android-project/app/src/main/AndroidManifest.xml": "vendor/main/android-project/app/src/main/AndroidManifest.xml",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/ArkwareApplication.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/ArkwareApplication.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/MainActivity.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/MainActivity.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/MediaPlaybackService.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/MediaPlaybackService.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/config/SpaConfig.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/config/SpaConfig.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/FullscreenVideoController.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/FullscreenVideoController.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/StretchToggleButtonFactory.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/StretchToggleButtonFactory.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/SurfaceViewZOrderNeutralizer.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/SurfaceViewZOrderNeutralizer.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/ZoomCropStrategy.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/fullscreen/ZoomCropStrategy.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/layout/LayoutReflowHelper.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/layout/LayoutReflowHelper.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/logging/ArkLogger.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/logging/ArkLogger.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/media/MediaNotificationFactory.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/media/MediaNotificationFactory.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/media/MediaSessionCoordinator.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/media/MediaSessionCoordinator.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/prefs/ForceFillPreference.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/prefs/ForceFillPreference.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/theme/CssColorParser.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/theme/CssColorParser.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/theme/StatusBarThemeApplier.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/theme/StatusBarThemeApplier.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/ArkScripts.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/ArkScripts.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/ArkWebViewFactory.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/ArkWebViewFactory.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/ArkJsBridge.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/ArkJsBridge.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/BridgeListeners.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/BridgeListeners.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/MediaPlaybackBridge.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/MediaPlaybackBridge.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/OrientationBridge.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/OrientationBridge.kt",
  "android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/ThemeBridge.kt": "vendor/main/android-project/app/src/main/java/com/horizonarkstudio/arkware/webview/bridge/ThemeBridge.kt",
  "android-project/app/src/main/res/drawable/ic_launcher_background.xml": "vendor/main/android-project/app/src/main/res/drawable/ic_launcher_background.xml",
  "android-project/app/src/main/res/drawable/ic_launcher_monochrome.xml": "vendor/main/android-project/app/src/main/res/drawable/ic_launcher_monochrome.xml",
  "android-project/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml": "vendor/main/android-project/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
  "android-project/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml": "vendor/main/android-project/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml",
  "android-project/app/src/main/res/mipmap-hdpi/ic_launcher.png": "vendor/main/android-project/app/src/main/res/mipmap-hdpi/ic_launcher.png",
  "android-project/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png": "vendor/main/android-project/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png",
  "android-project/app/src/main/res/mipmap-hdpi/ic_launcher_round.png": "vendor/main/android-project/app/src/main/res/mipmap-hdpi/ic_launcher_round.png",
  "android-project/app/src/main/res/mipmap-mdpi/ic_launcher.png": "vendor/main/android-project/app/src/main/res/mipmap-mdpi/ic_launcher.png",
  "android-project/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png": "vendor/main/android-project/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png",
  "android-project/app/src/main/res/mipmap-mdpi/ic_launcher_round.png": "vendor/main/android-project/app/src/main/res/mipmap-mdpi/ic_launcher_round.png",
  "android-project/app/src/main/res/mipmap-xhdpi/ic_launcher.png": "vendor/main/android-project/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
  "android-project/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png": "vendor/main/android-project/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png",
  "android-project/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png": "vendor/main/android-project/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png",
  "android-project/app/src/main/res/mipmap-xxhdpi/ic_launcher.png": "vendor/main/android-project/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
  "android-project/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png": "vendor/main/android-project/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png",
  "android-project/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png": "vendor/main/android-project/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png",
  "android-project/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png": "vendor/main/android-project/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
  "android-project/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png": "vendor/main/android-project/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png",
  "android-project/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png": "vendor/main/android-project/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png",
  "android-project/app/src/main/res/values-night/colors.xml": "vendor/main/android-project/app/src/main/res/values-night/colors.xml",
  "android-project/app/src/main/res/values-night/themes.xml": "vendor/main/android-project/app/src/main/res/values-night/themes.xml",
  "android-project/app/src/main/res/values/colors.xml": "vendor/main/android-project/app/src/main/res/values/colors.xml",
  "android-project/app/src/main/res/values/strings.xml": "vendor/main/android-project/app/src/main/res/values/strings.xml",
  "android-project/app/src/main/res/values/themes.xml": "vendor/main/android-project/app/src/main/res/values/themes.xml",
  "android-project/build.gradle.kts": "vendor/main/android-project/build.gradle.kts",
  "android-project/settings.gradle.kts": "vendor/main/android-project/settings.gradle.kts",
  "android-project/gradle.properties": "vendor/main/android-project/gradle.properties",
  "android-project/gradlew": "vendor/main/android-project/gradlew",
  "android-project/gradlew.bat": "vendor/main/android-project/gradlew.bat",
  "android-project/gradle/wrapper/gradle-wrapper.jar": "vendor/main/android-project/gradle/wrapper/gradle-wrapper.jar",
  "android-project/gradle/wrapper/gradle-wrapper.properties": "vendor/main/android-project/gradle/wrapper/gradle-wrapper.properties",
  // v2's native C shell (see ROADMAP.md's v2 stage) -- pulled in full
  // so `arkware linux build` (src/lib/linux.js) has real source to
  // scaffold + `cmake --build`, instead of this package reimplementing
  // or reproducing main's C shell from scratch. Every file under
  // linux-project/ is listed individually rather than synced as a
  // directory, same one-path-per-entry shape the rest of FILES
  // already uses -- no separate directory-walk codepath to maintain.
  "linux-project/CMakeLists.txt": "vendor/main/linux-project/CMakeLists.txt",
  "linux-project/README.md": "vendor/main/linux-project/README.md",
  "linux-project/arkware.config.example": "vendor/main/linux-project/arkware.config.example",
  "linux-project/src/main.c": "vendor/main/linux-project/src/main.c",
  "linux-project/src/webview_impl.cc": "vendor/main/linux-project/src/webview_impl.cc",
  "linux-project/src/config/config.c": "vendor/main/linux-project/src/config/config.c",
  "linux-project/src/config/config.h": "vendor/main/linux-project/src/config/config.h",
  "linux-project/src/logging/logging.c": "vendor/main/linux-project/src/logging/logging.c",
  "linux-project/src/logging/logging.h": "vendor/main/linux-project/src/logging/logging.h",
  "linux-project/src/media/media.c": "vendor/main/linux-project/src/media/media.c",
  "linux-project/src/media/media.h": "vendor/main/linux-project/src/media/media.h",
  "linux-project/src/shell/shell.c": "vendor/main/linux-project/src/shell/shell.c",
  "linux-project/src/shell/shell.h": "vendor/main/linux-project/src/shell/shell.h",
  "linux-project/src/webview_bridge/bridge.c": "vendor/main/linux-project/src/webview_bridge/bridge.c",
  "linux-project/src/webview_bridge/bridge.h": "vendor/main/linux-project/src/webview_bridge/bridge.h",
  "linux-project/vendor/webview.h": "vendor/main/linux-project/vendor/webview.h",
};

async function main() {
  const root = path.resolve(__dirname, "..");
  let usedGit = tryLocalGit(root);

  if (!usedGit) {
    console.log(`sync-from-main: no local ref for pinned commit '${REF}' found, fetching over HTTPS from ${RAW_BASE}`);
    await fetchAllOverHttps(root);
  }

  console.log(`sync-from-main: done (pinned to ${REF}).`);
}

function tryLocalGit(root) {
  try {
    // Confirms `main` actually resolves (local branch, or a remote
    // like origin/main) before trusting `git show` calls below.
    execFileSync("git", ["rev-parse", "--verify", REF], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    return false;
  }

  for (const [srcPath, destPath] of Object.entries(FILES)) {
    const dest = path.join(root, destPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      const contents = execFileSync(
        "git",
        ["show", `${REF}:${srcPath}`],
        { cwd: root }
      );
      fs.writeFileSync(dest, contents);
      restoreExecBitIfNeeded(dest);
      console.log(`sync-from-main: (git) ${srcPath} -> ${destPath}`);
    } catch (err) {
      console.warn(`sync-from-main: (git) failed on ${srcPath}: ${err.message}`);
    }
  }
  return true;
}

async function fetchAllOverHttps(root) {
  for (const [srcPath, destPath] of Object.entries(FILES)) {
    const dest = path.join(root, destPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      const body = await fetchUrl(RAW_BASE + srcPath);
      fs.writeFileSync(dest, body);
      restoreExecBitIfNeeded(dest);
      console.log(`sync-from-main: (https) ${srcPath} -> ${destPath}`);
    } catch (err) {
      console.warn(`sync-from-main: (https) failed on ${srcPath}: ${err.message}`);
    }
  }
}

// Neither `git show` (a blob's bytes, not its mode) nor a raw HTTPS
// fetch preserve the executable bit git stores for `gradlew`. Gradle's
// own wrapper shell script needs +x to run via `./gradlew`, the same
// way a person cloning android-project by hand would get it from git
// checkout -- so this is restoring what the sync path drops, not
// granting a new permission.
function restoreExecBitIfNeeded(dest) {
  if (path.basename(dest) === "gradlew") {
    fs.chmodSync(dest, 0o755);
  }
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

main().catch((err) => {
  // Non-fatal by design (see package.json's `prepare` script) --
  // a missing/unreachable sync shouldn't block `npm install` for a
  // consumer who already has everything they need.
  console.warn(`sync-from-main: ${err.message}`);
});
