# Getting started

## Install

```
npm install @horizon-ark-studio/arkware
```

`npm install` does more than fetch this package: its `prepare` script
runs `scripts/sync-from-main.js`, which pulls the LICENSE, README,
and Android flavor shape from the exact `main` commit pinned in
[`arkware-runtime.json`](../arkware-runtime.json). See
[`sync-and-versioning.md`](./sync-and-versioning.md) for what that
means in practice.

Requires Node.js >= 18, and the [Neutralino CLI](https://neutralino.js.org)
(`neu`) installed and on `PATH` — both `arkware-shell` and
`arkware-spa` shell out to `neu build` rather than vendoring it.

## Write `arkware.config.js`

Copy the example to your project root:

```
cp node_modules/@horizon-ark-studio/arkware/arkware.config.example.js ./arkware.config.js
```

Edit it for your app. Minimal example for a live URL shell:

```js
module.exports = {
  spa: {
    targetUrl: "https://example.com",
    displayName: "Example App",
  },
  app: {
    id: "com.example.exampleapp",
    version: "0.1.0",
    icon: "./icon.png",
  },
  platforms: {
    desktop: { enabled: true, outDir: "./arkware-dist/desktop" },
  },
};
```

Full field list: [`config-reference.md`](./config-reference.md).

## Pick a CLI

- Pointing at a **live site** you don't control the build of →
  `arkware-shell` (window loads a URL).
- Bundling a **SPA build you own** so it runs offline → `arkware-spa`
  (copies `spa.buildDir` into the app).

Both are covered in full in [`cli-reference.md`](./cli-reference.md).
The short version:

```
npx arkware-shell build
# or
npx arkware-spa build
```

Each scaffolds a Neutralino project under `platforms.desktop.outDir`
and runs `neu build`.

## Add Android packaging (optional)

Neither CLI builds an APK — that's a CI job on `main`. This package
only emits the config half:

```
npx arkware-shell emit-android-flavor
```

See [`android-flavor.md`](./android-flavor.md) for what to do with
the output.

## Next steps

- Full command/flag list → [`cli-reference.md`](./cli-reference.md)
- Every config field → [`config-reference.md`](./config-reference.md)
- How the `main` pin works and how to bump it →
  [`sync-and-versioning.md`](./sync-and-versioning.md)
