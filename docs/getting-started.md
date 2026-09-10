# Getting started

## Install

```
npm install @horizon-ark-studio/arkware
```

`npm install` does more than fetch this package: its `prepare` script
runs `scripts/sync-from-main.js`, which pulls the LICENSE, README,
the Android flavor shape, and the native Linux shell source
(`linux-project`) from the exact `main` commit pinned in
[`arkware-runtime.json`](../arkware-runtime.json). See
[`sync-and-versioning.md`](./sync-and-versioning.md) for what that
means in practice.

Requires Node.js >= 18. `arkware android emit-flavor` needs nothing
beyond that. `arkware linux build` additionally needs `cmake`,
`pkg-config`, and GTK3/WebKitGTK dev packages on `PATH` (see
[`linux-shell.md`](./linux-shell.md)) — you only need those if you're
using that command. There's no Neutralino dependency anywhere in this
package.

## Write `arkware.config.js`

Copy the example to your project root:

```
cp node_modules/@horizon-ark-studio/arkware/arkware.config.example.js ./arkware.config.js
```

Edit it for your app. Minimal example for the native Linux shell:

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
    linux: { enabled: true, outDir: "./arkware-dist/linux" },
  },
};
```

Full field list: [`config-reference.md`](./config-reference.md).

## Pick a command

- **Build the native Linux desktop shell** for a live site →
  `arkware linux build` (real GTK+WebKitGTK binary, built with
  `cmake`; Linux-only for now).
- **Author the Android Gradle flavor** so `main`'s CI builds an APK →
  `arkware android emit-flavor` (does not build the APK itself).

Both are covered in full in [`cli-reference.md`](./cli-reference.md).
The short version:

```
npx arkware linux build
# or
npx arkware android emit-flavor
```

`arkware linux build` copies `main`'s actual v2 native C shell source
into `platforms.linux.outDir` and runs `cmake` directly — no
Neutralino, no other toolchain vendored. See
[`linux-shell.md`](./linux-shell.md) for the toolchain it needs.

## Add Android packaging (optional)

`arkware linux build` doesn't build an APK, and this package doesn't
either — that's a CI job on `main`. This package only emits the
config half:

```
npx arkware android emit-flavor
```

See [`android-flavor.md`](./android-flavor.md) for what to do with
the output.

## Next steps

- Full command/flag list → [`cli-reference.md`](./cli-reference.md)
- Every config field → [`config-reference.md`](./config-reference.md)
- The native Linux shell (`arkware linux build`) →
  [`linux-shell.md`](./linux-shell.md)
- How the `main` pin works and how to bump it →
  [`sync-and-versioning.md`](./sync-and-versioning.md)
