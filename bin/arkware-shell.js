#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const { loadConfig } = require("../src/lib/config");
const neutralino = require("../src/lib/neutralino");
const { writeFlavorSnippet } = require("../src/lib/android");
const pkg = require("../package.json");

const HELP = `arkware-shell v${pkg.version} -- native desktop window pointed at a live URL

Wraps arkware.config.js's spa.targetUrl in a Neutralino window: the
window chrome is real and native, the content is whatever the live
SPA serves at that URL -- same shell/content split as ARKware's
Android WebView shell, generalized to desktop.

Usage:
  arkware-shell build [--config <path>]
  arkware-shell emit-android-flavor [--config <path>] [--out <path>]
  arkware-shell --help

Commands:
  build                 Scaffold + \`neu build\` a Neutralino app whose
                         window loads spa.targetUrl directly.
  emit-android-flavor    Write a Gradle product-flavor snippet for
                         android-project/app/build.gradle.kts, derived
                         from the same config. APKs themselves are
                         built by CI (see .github/workflows/android-build.yml
                         on the main branch), not by this CLI.

Options:
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
  --out <path>      emit-android-flavor only (default: ./arkware-android-flavor.gradle.kts)
  --version         Print the installed @horizon-ark-studio/arkware version and exit
  --help            Show this message and exit

See also: \`arkware-linux\`, the native C shell (GTK + WebKitGTK, no
Neutralino) that matches main's actual v2 desktop plan -- this CLI's
\`build\` command stays Neutralino-backed for backward compatibility.
`;

function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: "string" },
      out: { type: "string" },
      help: { type: "boolean" },
      version: { type: "boolean" },
    },
  });

  if (values.version) {
    console.log(pkg.version);
    process.exit(0);
  }

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  const command = positionals[0];

  try {
    if (command === "build") {
      const config = loadConfig(values.config, "shell");
      const { outDir } = neutralino.scaffold(config, "shell");
      console.log(`Scaffolded Neutralino shell project at ${outDir}`);
      console.log(`Window will load: ${config.spa.targetUrl}`);
      const ok = neutralino.build(outDir);
      process.exit(ok ? 0 : 1);
    } else if (command === "emit-android-flavor") {
      const config = loadConfig(values.config, "shell");
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
    } else {
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
    }
  } catch (err) {
    console.error(`arkware-shell: ${err.message}`);
    process.exit(1);
  }
}

main();
