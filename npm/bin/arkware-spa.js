#!/usr/bin/env node
"use strict";

const { parseArgs } = require("node:util");
const { loadConfig } = require("../src/lib/config");
const neutralino = require("../src/lib/neutralino");

const HELP = `arkware-spa -- offline native app bundling a local SPA build

Copies arkware.config.js's spa.buildDir (your SPA's already-built
static output) into a Neutralino app's own resources and serves it
locally, so the result runs without a network connection to the
original site. Use this instead of arkware-shell when you own the
SPA's build output and want it fully bundled rather than fetched live.

Usage:
  arkware-spa build [--config <path>]
  arkware-spa --help

Options:
  --config <path>   Path to arkware.config.js (default: ./arkware.config.js)
`;

function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      config: { type: "string" },
      help: { type: "boolean" },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  const command = positionals[0];

  try {
    if (command === "build") {
      const config = loadConfig(values.config, "spa");
      const { outDir } = neutralino.scaffold(config, "spa");
      console.log(`Scaffolded Neutralino SPA project at ${outDir}`);
      console.log(`Bundled build output from: ${config.spa.buildDir}`);
      const ok = neutralino.build(outDir);
      process.exit(ok ? 0 : 1);
    } else {
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
    }
  } catch (err) {
    console.error(`arkware-spa: ${err.message}`);
    process.exit(1);
  }
}

main();
