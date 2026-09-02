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
  "android-project/app/build.gradle.kts": "vendor/main/android-build.gradle.kts",
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
      console.log(`sync-from-main: (https) ${srcPath} -> ${destPath}`);
    } catch (err) {
      console.warn(`sync-from-main: (https) failed on ${srcPath}: ${err.message}`);
    }
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
