#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const pkg = require("../package.json");
const { loadConfig } = require("../src/lib/config");
const linux = require("../src/lib/linux");
const android = require("../src/lib/android");

const TOP_HELP = `arkware v${pkg.version} -- package any SPA as a thin native shell

Usage:
  arkware <command> <subcommand> [options]

Commands:
  android build           Scaffold the full vendored android-project
                          locally (live URL or bundled local assets --
                          same either way), optionally building it with
                          a configured Android SDK
  android spa-native      Alias for \`android build --assets <path>\`:
                          same full local scaffold, bundled assets required
  android flavor-snippet  Gradle product-flavor snippet only, for pasting
                          into main's checkout so CI builds it (no local
                          scaffold)
  android spa-shell       Not yet supported -- see
                          docs/PROPOSAL-spa-shell-and-spa-native.md
  linux build             Scaffold + cmake-build main's native Linux shell
                          (GTK + WebKitGTK)

Options:
  --version   Print the installed @horizon-ark-studio/arkware version and exit
  --help      Show this message

Run \`arkware <command> --help\` for a command's own usage.
`;

const HELP = {
  android: `arkware android -- Android shell packaging

\`arkware android build\` scaffolds the FULL vendored android-project
locally into platforms.android.outDir -- the same thing \`arkware linux
build\` does for linux-project. It works the same way regardless of
whether the flavor points at a live URL (spa.targetUrl) or bundles a
local site's files into app/src/main/assets/ (platforms.android
.bundledAssets, or --assets on the command line): either way you get a
real, self-contained Gradle project on disk with the flavor already
spliced into build.gradle.kts. This does NOT compile an APK by
default -- that's still a CI job (.github/workflows/android-build.yml
on main) -- but pass --build to also run
\`./gradlew assemble<Flavor>Debug\` locally afterward (needs a JDK +
configured Android SDK on PATH), the same opt-in \`linux build\`
doesn't need to offer since it always compiles.

\`arkware android spa-native\` is the same command with bundled local
assets required (an error if neither --assets nor
platforms.android.bundledAssets is set) -- kept as its own name since
"scaffold a fully offline app from a local site" is a distinct enough
intent to spell out, even though it now shares its implementation with
\`build\`.

\`arkware android flavor-snippet\` is the old \`build\` behavior, kept
under its own name: it does NOT scaffold anything locally, and instead
writes just the Gradle product-flavor snippet to paste into
android-project/app/build.gradle.kts on main's own checkout, for
projects that only want CI to ever build the APK and have no interest
in a local scaffold at all.

\`spa-shell\` (point at a live URL, show an offline-fallback SVG when
disconnected) isn't supported on Android yet -- see
docs/PROPOSAL-spa-shell-and-spa-native.md for exactly what's missing
and why.

Usage:
  arkware android build [--config <path>] [--assets <path>] [--build]
  arkware android spa-native [--config <path>] [--assets <path>] [--build]
  arkware android flavor-snippet [--config <path>] [--out <path>]

Options (build / spa-native):
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
  --assets <path>   Local site directory (containing index.html) to bundle --
                     overrides platforms.android.bundledAssets.assetsDir.
                     Required for spa-native; optional for build (omit it,
                     and don't set platforms.android.bundledAssets either,
                     to scaffold a flavor pointed at spa.targetUrl instead).
  --build           Also run \`./gradlew assemble<Flavor>Debug\` in the
                     scaffolded outDir after copying (needs a JDK + Android
                     SDK on PATH; not run by default)
  --help            Show this message

Options (flavor-snippet):
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
  --out <path>      Output path (default: ./arkware-android-flavor.gradle.kts)
  --help            Show this message

If vendor/main/android-project is missing, run \`npm run sync\` first.
`,
  linux: `arkware linux -- main's real native C shell (GTK + WebKitGTK)

Scaffolds main's v2 native Linux shell source (linux-project) into
platforms.linux.outDir and runs cmake against it -- the same two
commands (\`cmake -S . -B build\`, \`cmake --build build\`) a person
would run by hand. Requires cmake, pkg-config, and the GTK3/WebKitGTK
dev packages on PATH. Off by default -- set platforms.linux.enabled:
true in arkware.config.js to use it.

Usage:
  arkware linux build [--config <path>]

Options:
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
  --help            Show this message

If vendor/main/linux-project is missing, run \`npm run sync\` first.
`,
};

function runAndroid(args) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      out: { type: "string" },
      assets: { type: "string" },
      build: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP.android);
    process.exit(values.help ? 0 : 1);
  }

  const sub = positionals[0];

  if (sub === "spa-shell") {
    console.error(
      `arkware android ${sub}: not supported yet.\n\n` +
        "The offline-fallback overlay needs new native code on both " +
        "platforms first (an onReceivedError override + injected JS on " +
        "Android, webview_init() wiring on Linux) -- that has to land on " +
        "main before this CLI has anything real to generate. See " +
        "docs/PROPOSAL-spa-shell-and-spa-native.md, Feature B."
    );
    process.exit(1);
  }

  if (sub === "build" || sub === "spa-native") {
    const config = loadConfig(values.config);

    if (values.assets) {
      config.platforms.android.bundledAssets = {
        enabled: true,
        assetsDir: values.assets,
      };
    }

    // spa-native's whole point is "bundle a local site" -- unlike plain
    // `build`, it's an error for it to fall through to spa.targetUrl.
    if (
      sub === "spa-native" &&
      (!config.platforms.android.bundledAssets || !config.platforms.android.bundledAssets.enabled)
    ) {
      console.error(
        "arkware android spa-native: no local site to bundle.\n\n" +
          "Pass --assets <path> pointing at the directory containing your " +
          "site's index.html, or set platforms.android.bundledAssets " +
          "= { enabled: true, assetsDir: '...' } in arkware.config.js."
      );
      process.exit(1);
    }

    // Same scaffold() call either way -- it already branches internally
    // on config.platforms.android.bundledAssets to decide between a
    // live-URL flavor and a bundled-assets one (see targetUrlOverride
    // in src/lib/android.js), so `build` doesn't need to know or care
    // which mode it's in, same as `linux build` doesn't branch on it.
    const { outDir, assetsCopied, flavor } = android.scaffold(config);
    console.log(`Scaffolded native Android project at ${outDir}`);
    console.log(
      assetsCopied
        ? `Flavor "${flavor}" bundled local assets -- WebView will load: file:///android_asset/index.html`
        : `Flavor "${flavor}" points at: ${config.spa.targetUrl}`
    );

    if (values.build) {
      const ok = android.build(outDir, flavor);
      process.exit(ok ? 0 : 1);
    }

    console.log(
      `To build locally: cd ${outDir} && ./gradlew assemble${capitalize(flavor)}Debug ` +
        `(or re-run with --build). CI (.github/workflows/android-build.yml) builds ` +
        "from main's own checkout, not this scaffolded copy -- to also get this " +
        "flavor built by CI, run `arkware android flavor-snippet` and paste its " +
        "output into android-project/app/build.gradle.kts on main, then push."
    );
    return;
  }

  if (sub === "flavor-snippet") {
    const config = loadConfig(values.config);
    const out = android.writeFlavorSnippet(
      config,
      values.out || "./arkware-android-flavor.gradle.kts"
    );
    console.log(`Wrote Gradle product-flavor snippet to ${out}`);
    console.log(
      "Paste it into android-project/app/build.gradle.kts's productFlavors " +
        "block, add the flavor name to the matrix in " +
        ".github/workflows/android-build.yml, then push -- CI builds the APK."
    );
    return;
  }

  console.error(`Unknown subcommand: android ${sub}\n`);
  console.log(HELP.android);
  process.exit(1);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function runLinux(args) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      help: { type: "boolean" },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP.linux);
    process.exit(values.help ? 0 : 1);
  }

  const sub = positionals[0];
  if (sub !== "build") {
    console.error(`Unknown subcommand: linux ${sub}\n`);
    console.log(HELP.linux);
    process.exit(1);
  }

  const config = loadConfig(values.config);
  const { outDir } = linux.scaffold(config);
  console.log(`Scaffolded native Linux shell project at ${outDir}`);
  console.log(`Window will load: ${config.spa.targetUrl}`);
  const ok = linux.build(outDir);
  process.exit(ok ? 0 : 1);
}

const COMMANDS = { android: runAndroid, linux: runLinux };

function main() {
  const argv = process.argv.slice(2);
  const [command, ...rest] = argv;

  if (!command || command === "--help") {
    console.log(TOP_HELP);
    process.exit(command ? 0 : 1);
  }

  if (command === "--version") {
    console.log(pkg.version);
    process.exit(0);
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    console.log(TOP_HELP);
    process.exit(1);
  }

  try {
    handler(rest);
  } catch (err) {
    console.error(`arkware ${command}: ${err.message}`);
    process.exit(1);
  }
}

main();
