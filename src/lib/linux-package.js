"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/**
 * Wraps the already cmake-built binary from linux.js's build()
 * (outDir/build/arkware -- see linux-project/CMakeLists.txt's
 * `add_executable(arkware ...)` / `install(TARGETS arkware RUNTIME
 * DESTINATION bin)`) into one installable file: an AppImage (the
 * default), a .deb, or an .rpm. Same "spawn the real toolchain,
 * don't vendor or reimplement it" stance as linux.js/android.js --
 * this shells out to `cmake --install`, `dpkg-deb`, `rpmbuild`, and
 * `appimagetool`, all expected on PATH, rather than reimplementing
 * any package-format internals itself.
 *
 * All three formats stage files through `cmake --install` into a
 * throwaway prefix under outDir first, so the binary's actual
 * location within each package (usr/bin/arkware) comes from
 * linux-project's own `install()` rule, not a hand-maintained copy
 * list here.
 */

// Matches add_executable(arkware ...) in linux-project/CMakeLists.txt.
const BINARY_NAME = "arkware";

/**
 * @param {string} name a command to look for on PATH
 * @returns {boolean}
 */
function hasCommand(name) {
  const result = spawnSync(name, ["--version"], { stdio: "ignore" });
  return !(result.error && result.error.code === "ENOENT");
}

/**
 * Runs `cmake --install build --prefix <prefix>` in outDir -- reuses
 * linux-project's own install() rule instead of hand-copying the
 * binary, same as android.js reuses android-project's own
 * build.gradle.kts rather than reimplementing Gradle's shape.
 *
 * @param {string} outDir the scaffolded+built project (linux.build()'s cwd)
 * @param {string} prefix destination install prefix
 */
function stagingInstall(outDir, prefix) {
  const result = spawnSync(
    "cmake",
    ["--install", "build", "--prefix", prefix],
    { cwd: outDir, stdio: "inherit" }
  );
  if (result.error && result.error.code === "ENOENT") {
    throw new Error(
      "Could not run `cmake --install` -- is cmake on PATH? (Same " +
        "requirement `arkware linux build` already has.)"
    );
  }
  if (result.status !== 0) {
    throw new Error("cmake --install failed -- see output above.");
  }
}

/** Renders a freedesktop .desktop entry for the shell. */
function desktopFileContents(config) {
  return (
    `[Desktop Entry]\n` +
    `Type=Application\n` +
    `Name=${config.spa.displayName}\n` +
    `Exec=${BINARY_NAME}\n` +
    `Icon=${config.app.id}\n` +
    `Categories=Network;\n` +
    `Terminal=false\n`
  );
}

/**
 * Debian package names must be lowercase and limited to
 * [a-z0-9][a-z0-9+.-]* -- app.id is a reverse-DNS Java-style id
 * (e.g. "com.example.exampleapp"), so this just lowercases it and
 * swaps `.` for `-`, which is also a fine RPM Name value (RPM is
 * looser but there's no reason to have two different derivations).
 *
 * @param {import('./config').ArkwareConfig} config
 * @returns {string}
 */
function packageName(config) {
  return config.app.id.toLowerCase().replace(/[^a-z0-9+.-]/g, "-");
}

function debianArch() {
  const result = spawnSync("dpkg", ["--print-architecture"], {
    encoding: "utf8",
  });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return "amd64"; // reasonable default if dpkg itself is missing
}

function distDir(outDir) {
  const dir = path.join(outDir, "dist");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Builds an AppImage from outDir's already-built project.
 *
 * Requires `appimagetool` on PATH (see
 * https://github.com/AppImage/appimagetool/releases -- the
 * "continuous" x86_64 build is a single executable, no install
 * step). This does NOT bundle non-standard shared libraries the way
 * `linuxdeploy` would; it packages exactly what `cmake --install`
 * and the system linker resolve at runtime, which is enough for
 * testing locally and matches what `--github-actions`' generated
 * workflow does too.
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {string} outDir
 * @returns {string} path to the produced .AppImage
 */
function packageAppImage(config, outDir) {
  if (!hasCommand("appimagetool")) {
    throw new Error(
      "arkware linux build --app-img needs `appimagetool` on PATH. Get it " +
        "from https://github.com/AppImage/appimagetool/releases (the " +
        "continuous x86_64 build is a single chmod +x executable) -- or " +
        "use --github-actions to build it in CI instead, which downloads " +
        "it automatically."
    );
  }

  const appDir = path.join(outDir, "AppDir");
  fs.rmSync(appDir, { recursive: true, force: true });
  stagingInstall(outDir, path.join(appDir, "usr"));

  // appimagetool requires exactly one .desktop file and (if present)
  // a same-named icon at the AppDir *root*, separate from the
  // usr/share/applications copy a real install would also want --
  // both are written so the AppImage is well-formed either way.
  const desktopName = `${packageName(config)}.desktop`;
  fs.writeFileSync(path.join(appDir, desktopName), desktopFileContents(config));
  fs.mkdirSync(path.join(appDir, "usr", "share", "applications"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(appDir, "usr", "share", "applications", desktopName),
    desktopFileContents(config)
  );

  const iconPath = path.join(appDir, `${config.app.id}.png`);
  if (config.app.icon) {
    fs.copyFileSync(config.app.icon, iconPath);
  } else {
    // appimagetool requires the Icon= name referenced by the desktop
    // file to resolve to an actual file at the AppDir root -- a 1x1
    // transparent PNG placeholder is enough to satisfy that when no
    // real app.icon was configured (same "don't block on optional
    // config" stance config.js already takes for app.icon elsewhere).
    fs.writeFileSync(
      iconPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      )
    );
  }

  // AppRun is what actually launches on double-click -- a thin
  // relative-path wrapper so the AppImage works regardless of where
  // it's mounted/extracted to.
  const appRun =
    `#!/bin/sh\n` +
    `HERE="$(dirname "$(readlink -f "$0")")"\n` +
    `exec "$HERE/usr/bin/${BINARY_NAME}" "$@"\n`;
  const appRunPath = path.join(appDir, "AppRun");
  fs.writeFileSync(appRunPath, appRun);
  fs.chmodSync(appRunPath, 0o755);

  const outFile = path.join(
    distDir(outDir),
    `${packageName(config)}-${config.app.version}-x86_64.AppImage`
  );
  fs.rmSync(outFile, { force: true });

  // ARCH is required when appimagetool can't otherwise infer it (no
  // AppStream metadata in this minimal AppDir).
  const result = spawnSync("appimagetool", [appDir, outFile], {
    stdio: "inherit",
    env: { ...process.env, ARCH: process.env.ARCH || "x86_64" },
  });
  if (result.status !== 0) {
    throw new Error("appimagetool failed -- see output above.");
  }
  if (!fs.existsSync(outFile)) {
    throw new Error(
      `appimagetool exited 0 but ${outFile} wasn't created -- check its output above.`
    );
  }
  return outFile;
}

/**
 * Builds a .deb from outDir's already-built project via `dpkg-deb`.
 * Runtime GTK3/WebKitGTK libs are declared as package Depends rather
 * than bundled -- apt resolves them on install, the normal Debian
 * packaging convention (unlike the AppImage path, which has no
 * package manager to lean on).
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {string} outDir
 * @returns {string} path to the produced .deb
 */
function packageDebian(config, outDir) {
  if (!hasCommand("dpkg-deb")) {
    throw new Error(
      "arkware linux build --debian needs `dpkg-deb` on PATH (ships by " +
        "default on Debian/Ubuntu; `apt-get install dpkg` elsewhere), or " +
        "use --github-actions to build it in CI instead."
    );
  }

  const name = packageName(config);
  const arch = debianArch();
  const stageDir = path.join(outDir, "deb", `${name}_${config.app.version}_${arch}`);
  fs.rmSync(stageDir, { recursive: true, force: true });

  stagingInstall(outDir, path.join(stageDir, "usr"));

  const desktopDir = path.join(stageDir, "usr", "share", "applications");
  fs.mkdirSync(desktopDir, { recursive: true });
  fs.writeFileSync(path.join(desktopDir, `${name}.desktop`), desktopFileContents(config));

  if (config.app.icon) {
    const iconDir = path.join(stageDir, "usr", "share", "icons", "hicolor", "256x256", "apps");
    fs.mkdirSync(iconDir, { recursive: true });
    fs.copyFileSync(config.app.icon, path.join(iconDir, `${config.app.id}.png`));
  }

  const debianDir = path.join(stageDir, "DEBIAN");
  fs.mkdirSync(debianDir, { recursive: true });
  const control =
    `Package: ${name}\n` +
    `Version: ${config.app.version}\n` +
    `Section: web\n` +
    `Priority: optional\n` +
    `Architecture: ${arch}\n` +
    // gtk3/webkit2gtk package names per Ubuntu 22.04+/Debian 12+ --
    // matches the pkg-config modules linux-project/CMakeLists.txt
    // already requires to build in the first place.
    `Depends: libgtk-3-0, libwebkit2gtk-4.1-0\n` +
    `Maintainer: ${config.app.maintainer || "unset <unset@example.com>"}\n` +
    `Description: ${config.spa.displayName}\n` +
    ` Packaged by arkware.\n`;
  fs.writeFileSync(path.join(debianDir, "control"), control);

  const outFile = path.join(distDir(outDir), `${name}_${config.app.version}_${arch}.deb`);
  fs.rmSync(outFile, { force: true });

  const result = spawnSync(
    "dpkg-deb",
    ["--build", "--root-owner-group", stageDir, outFile],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error("dpkg-deb --build failed -- see output above.");
  }
  return outFile;
}

/**
 * Builds an .rpm from outDir's already-built project via `rpmbuild`.
 * Like packageDebian(), this is a binary-only spec -- no %prep/%build
 * source-tarball dance, since the binary this wraps is already built
 * by linux.js's build(); %install just copies the already-staged
 * tree cmake --install produced.
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {string} outDir
 * @returns {string} path to the produced .rpm
 */
function packageRpm(config, outDir) {
  if (!hasCommand("rpmbuild")) {
    throw new Error(
      "arkware linux build --rpm needs `rpmbuild` on PATH (`apt-get " +
        "install rpm` on Debian/Ubuntu, `dnf install rpm-build` on " +
        "Fedora/RHEL), or use --github-actions to build it in CI instead."
    );
  }

  const name = packageName(config);
  const topDir = path.join(outDir, "rpmbuild");
  for (const sub of ["BUILD", "RPMS", "SOURCES", "SPECS", "SRPMS", "BUILDROOT"]) {
    fs.mkdirSync(path.join(topDir, sub), { recursive: true });
  }

  const stageDir = path.join(outDir, "rpm-stage");
  fs.rmSync(stageDir, { recursive: true, force: true });
  stagingInstall(outDir, path.join(stageDir, "usr"));

  const desktopDir = path.join(stageDir, "usr", "share", "applications");
  fs.mkdirSync(desktopDir, { recursive: true });
  const desktopPath = path.join(desktopDir, `${name}.desktop`);
  fs.writeFileSync(desktopPath, desktopFileContents(config));

  let iconLine = "";
  if (config.app.icon) {
    const iconDir = path.join(stageDir, "usr", "share", "icons", "hicolor", "256x256", "apps");
    fs.mkdirSync(iconDir, { recursive: true });
    fs.copyFileSync(config.app.icon, path.join(iconDir, `${config.app.id}.png`));
    iconLine = `/usr/share/icons/hicolor/256x256/apps/${config.app.id}.png\n`;
  }

  const spec =
    `Name: ${name}\n` +
    `Version: ${config.app.version}\n` +
    `Release: 1\n` +
    `Summary: ${config.spa.displayName}\n` +
    `License: Proprietary\n` +
    `BuildArch: x86_64\n` +
    // webkit2gtk4.1 is the Fedora/RHEL package name (vs. Debian's
    // libwebkit2gtk-4.1-0 in packageDebian()) -- same library, each
    // distro family's own naming convention.
    `Requires: gtk3, webkit2gtk4.1\n` +
    `\n` +
    `%description\n` +
    `${config.spa.displayName}, packaged by arkware.\n` +
    `\n` +
    `%prep\n` +
    `%build\n` +
    `\n` +
    `%install\n` +
    `rm -rf %{buildroot}\n` +
    `mkdir -p %{buildroot}\n` +
    `cp -a ${stageDir}/. %{buildroot}/\n` +
    `\n` +
    `%files\n` +
    `/usr/bin/${BINARY_NAME}\n` +
    `/usr/share/applications/${name}.desktop\n` +
    iconLine +
    `\n` +
    `%clean\n` +
    `rm -rf %{buildroot}\n`;

  const specPath = path.join(topDir, "SPECS", `${name}.spec`);
  fs.writeFileSync(specPath, spec);

  const result = spawnSync(
    "rpmbuild",
    ["--define", `_topdir ${topDir}`, "-bb", specPath],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error("rpmbuild failed -- see output above.");
  }

  const rpmsRoot = path.join(topDir, "RPMS");
  const built = findFirstRpm(rpmsRoot);
  if (!built) {
    throw new Error(
      `rpmbuild exited 0 but no .rpm was found under ${rpmsRoot} -- check its output above.`
    );
  }

  const outFile = path.join(distDir(outDir), path.basename(built));
  fs.copyFileSync(built, outFile);
  return outFile;
}

function findFirstRpm(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFirstRpm(full);
      if (found) return found;
    } else if (entry.name.endsWith(".rpm")) {
      return full;
    }
  }
  return null;
}

const FORMATS = ["app-img", "debian", "rpm"];

/**
 * Dispatches to the right package*() function for a --app-img /
 * --debian / --rpm CLI flag value.
 *
 * @param {"app-img"|"debian"|"rpm"} format
 * @param {import('./config').ArkwareConfig} config
 * @param {string} outDir
 * @returns {string} path to the produced package file
 */
function packageFor(format, config, outDir) {
  if (format === "debian") return packageDebian(config, outDir);
  if (format === "rpm") return packageRpm(config, outDir);
  if (format === "app-img") return packageAppImage(config, outDir);
  throw new Error(`Unknown package format: ${format} (expected one of ${FORMATS.join(", ")})`);
}

/**
 * Renders a GitHub Actions workflow that scaffolds, builds, and
 * packages the Linux shell in CI -- installing whichever toolchain
 * each format needs (appimagetool isn't apt-installable, so it's
 * downloaded straight from its GitHub release) rather than assuming
 * the person's own machine has all three.
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {"app-img"|"debian"|"rpm"|undefined} format single format to
 *   build, or undefined to build all three as a matrix
 * @returns {{path: string, contents: string}}
 */
function renderGithubActionsWorkflow(config, format) {
  const formats = format ? [format] : FORMATS;
  const single = formats.length === 1;

  const matrixBlock = single
    ? ""
    : `    strategy:\n      matrix:\n        format: [${FORMATS.join(", ")}]\n`;
  const formatExpr = single ? formats[0] : "${{ matrix.format }}";
  const artifactName = single ? `arkware-linux-${formats[0]}` : "arkware-linux-${{ matrix.format }}";

  // GitHub Actions `if:` conditions only make sense for the matrix
  // case (a single-format run either always or never needs a given
  // tool, decided once here rather than evaluated per-run in CI).
  const needsRpm = single ? formats[0] === "rpm" : true;
  const needsAppImage = single ? formats[0] === "app-img" : true;
  const rpmIf = single ? "true" : "matrix.format == 'rpm'";
  const appImageIf = single ? "true" : "matrix.format == 'app-img'";

  const rpmStep = needsRpm
    ? `      - name: Install rpmbuild\n` +
      (single ? "" : `        if: \${{ ${rpmIf} }}\n`) +
      `        run: sudo apt-get install -y rpm\n` +
      `\n`
    : "";
  const appImageStep = needsAppImage
    ? `      - name: Install appimagetool\n` +
      (single ? "" : `        if: \${{ ${appImageIf} }}\n`) +
      `        run: |\n` +
      `          sudo curl -L -o /usr/local/bin/appimagetool \\\n` +
      `            https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage\n` +
      `          sudo chmod +x /usr/local/bin/appimagetool\n` +
      `\n`
    : "";

  const contents =
    `# Generated by \`arkware linux build --github-actions\`.\n` +
    `# Scaffolds, cmake-builds, and packages main's native Linux shell for\n` +
    `# this SPA (see docs/linux-shell.md and docs/cli-reference.md in\n` +
    `# @horizon-ark-studio/arkware). Re-run the CLI command to regenerate\n` +
    `# this file after upgrading arkware or changing which formats to build.\n` +
    `name: Linux packaging (arkware)\n` +
    `\n` +
    `on:\n` +
    `  push:\n` +
    `    branches: [main]\n` +
    `  workflow_dispatch:\n` +
    `\n` +
    `jobs:\n` +
    `  package:\n` +
    `    runs-on: ubuntu-latest\n` +
    matrixBlock +
    `    steps:\n` +
    `      - uses: actions/checkout@v4\n` +
    `\n` +
    `      - uses: actions/setup-node@v4\n` +
    `        with:\n` +
    `          node-version: 20\n` +
    `\n` +
    `      - name: Install build dependencies\n` +
    `        run: |\n` +
    `          sudo apt-get update\n` +
    `          sudo apt-get install -y cmake pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev\n` +
    `\n` +
    rpmStep +
    appImageStep +
    `      - run: npm ci\n` +
    `\n` +
    `      - name: Build + package\n` +
    `        run: npx arkware linux build --${formatExpr}\n` +
    `\n` +
    `      - uses: actions/upload-artifact@v4\n` +
    `        with:\n` +
    `          name: ${artifactName}\n` +
    `          path: ${config.platforms.linux.outDir}/dist/*\n`;

  const workflowPath = path.join(
    config.__configDir,
    ".github",
    "workflows",
    "arkware-linux-build.yml"
  );
  return { path: workflowPath, contents };
}

/**
 * Writes renderGithubActionsWorkflow()'s output to disk.
 *
 * @param {import('./config').ArkwareConfig} config
 * @param {"app-img"|"debian"|"rpm"|undefined} format
 * @returns {string} the path written
 */
function writeGithubActionsWorkflow(config, format) {
  const { path: workflowPath, contents } = renderGithubActionsWorkflow(config, format);
  fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
  fs.writeFileSync(workflowPath, contents);
  return workflowPath;
}

module.exports = {
  FORMATS,
  packageName,
  packageAppImage,
  packageDebian,
  packageRpm,
  packageFor,
  renderGithubActionsWorkflow,
  writeGithubActionsWorkflow,
};
