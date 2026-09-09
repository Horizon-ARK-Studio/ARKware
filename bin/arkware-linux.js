#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const { loadConfig } = require("../src/lib/config");
const linux = require("../src/lib/linux");
const pkg = require("../package.json");

const HELP = `arkware-linux v${pkg.version} -- native Linux desktop shell (GTK + WebKitGTK)

Scaffolds and builds ARKware's v2 native C shell (linux-project on
main -- see docs/Foundational/ROADMAP.md's v2 stage) against the same
arkware.config.js the other CLIs read. Unlike arkware-shell/
arkware-spa, this doesn't go through Neutralino at all: it's the real
C shell embedding the system's own WebKitGTK, matching what \`main\`
actually ships for Linux desktop (ROADMAP.md's v2 is explicit that
desktop is "one native C shell per OS", not Neutralino).

Usage:
  arkware-linux build [--config <path>]
  arkware-linux --version
  arkware-linux --help

Commands:
  build   Write this shell's own arkware.config (a flat KEY=value
          file -- see linux-project/README.md on main) from
          spa.targetUrl / spa.displayName / spa.nagHide*, copy the
          vendored linux-project source into platforms.linux.outDir,
          and run \`cmake -S . -B build\` + \`cmake --build build\`
          there. Requires spa.targetUrl and platforms.linux.enabled:
          true (platforms.linux is off by default -- see
          arkware.config.example.js).

Options:
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
  --version         Print the installed @horizon-ark-studio/arkware version and exit
  --help            Show this message and exit

Requires \`cmake\`, \`pkg-config\`, and the GTK3/WebKitGTK dev packages on
PATH to actually build (not vendored by this package -- see
linux-project/README.md's Building section on main for the exact
package names per distro). If vendor/main/linux-project is missing,
run \`npm run sync\` first (see docs/sync-and-versioning.md).
`;

function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: "string" },
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
      // mode "shell" reuses the existing spa.targetUrl requirement --
      // arkware-linux points a real window at a live URL, same as
      // arkware-shell does via Neutralino; it doesn't (yet) have a
      // arkware-spa-style offline/bundled-build counterpart.
      const config = loadConfig(values.config, "shell");
      const { outDir } = linux.scaffold(config);
      console.log(`Scaffolded native Linux shell project at ${outDir}`);
      console.log(`Window will load: ${config.spa.targetUrl}`);
      const ok = linux.build(outDir);
      process.exit(ok ? 0 : 1);
    } else {
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
    }
  } catch (err) {
    console.error(`arkware-linux: ${err.message}`);
    process.exit(1);
  }
}

main();
