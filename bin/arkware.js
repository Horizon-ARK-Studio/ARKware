#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const pkg = require("../package.json");
const { loadConfig } = require("../src/lib/config");
const linux = require("../src/lib/linux");
const { writeFlavorSnippet } = require("../src/lib/android");

const TOP_HELP = `arkware v${pkg.version} -- package any SPA as a thin native shell

Usage:
  arkware <command> <subcommand> [options]

Commands:
  android build         Gradle product-flavor config for main's CI to
                         compile (no local build step)
  android spa-shell      Not yet supported -- see
                         docs/PROPOSAL-spa-shell-and-spa-native.md
  android spa-native     Not yet supported -- see
                         docs/PROPOSAL-spa-shell-and-spa-native.md
  linux build             Scaffold + cmake-build main's native Linux shell
                         (GTK + WebKitGTK)

Options:
  --version   Print the installed @horizon-ark-studio/arkware version and exit
  --help      Show this message

Run \`arkware <command> --help\` for a command's own usage.
`;

const HELP = {
  android: `arkware android -- Android shell packaging (Gradle flavor authoring)

\`arkware android build\` does NOT compile an APK -- that's a CI job
(.github/workflows/android-build.yml on main). "build" here means the
same thing it means for \`arkware linux build\`'s scaffold half: turn
arkware.config.js into the platform's own real input -- here, the
productFlavors shape android-project/app/build.gradle.kts already
hand-defines for the youtube/template flavors. Linux additionally
compiles that input locally (\`cmake --build\`); Android's build is CI's
job, so this command stops at authoring the config.

\`spa-shell\` (point at a live URL, show an offline-fallback SVG when
disconnected) and \`spa-native\` (bundle a local site, no live URL at
all) aren't supported on Android yet -- see
docs/PROPOSAL-spa-shell-and-spa-native.md for exactly what's missing
and why.

Usage:
  arkware android build [--config <path>] [--out <path>]

Options:
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
  --out <path>      Output path (default: ./arkware-android-flavor.gradle.kts)
  --help            Show this message
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
      help: { type: "boolean" },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP.android);
    process.exit(values.help ? 0 : 1);
  }

  const sub = positionals[0];

  if (sub === "spa-shell" || sub === "spa-native") {
    console.error(
      `arkware android ${sub}: not supported yet.\n\n` +
        "Android currently only has `arkware android build`, which " +
        "authors a Gradle flavor for main's CI to compile -- it doesn't " +
        "point the shell at a bundled local site or an offline-fallback " +
        "SVG. See docs/PROPOSAL-spa-shell-and-spa-native.md for exactly " +
        "what's missing and why, on both platforms."
    );
    process.exit(1);
  }

  if (sub !== "build") {
    console.error(`Unknown subcommand: android ${sub}\n`);
    console.log(HELP.android);
    process.exit(1);
  }

  const config = loadConfig(values.config);
  const out = writeFlavorSnippet(
    config,
    values.out || "./arkware-android-flavor.gradle.kts"
  );
  console.log(`Wrote Gradle product-flavor snippet to ${out}`);
  console.log(
    "Paste it into android-project/app/build.gradle.kts's productFlavors " +
      "block, add the flavor name to the matrix in " +
      ".github/workflows/android-build.yml, then push -- CI builds the APK."
  );
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
