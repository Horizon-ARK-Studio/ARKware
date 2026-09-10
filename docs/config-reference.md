# `arkware.config.js` reference

The single file both commands read. Copy
[`arkware.config.example.js`](../arkware.config.example.js) to your
project root as `arkware.config.js`, or point `--config` at it
elsewhere. Loaded by [`src/lib/config.js`](../src/lib/config.js).

```js
module.exports = {
  spa: { /* ... */ },
  app: { /* ... */ },
  platforms: { /* ... */ },
};
```

## `spa`

| Field | Type | Notes |
|---|---|---|
| `targetUrl` | `string` | Live URL the native window points at, and the value emitted as the Android `BuildConfig` field `TARGET_URL`. **Required** — `loadConfig` asserts this regardless of which command you run, since both read it. |
| `displayName` | `string` | Window titles, the Android media notification's subtitle/artist field, generated app metadata. **Required.** |
| `nagHideSelectors` | `string[]` | CSS selectors for an "open our app" nag banner to hide, if the SPA has one. Mirrors `SpaConfig.kt` on the Android side. Empty by default — arkware won't guess selectors for you. Passed through to both `arkware android emit-flavor` and `arkware linux build`. |
| `nagHideTextMatches` | `string[]` | Same purpose as above, matched by text content instead of selector. Same commands as above. |

## `app`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Reverse-DNS id. On the Android side, becomes an `applicationIdSuffix` of `.{platforms.android.flavor}` off `com.horizonarkstudio.arkware` — same convention as the existing `youtube`/`template` flavors. |
| `version` | `string` | App version string. |
| `icon` | `string` | Path to a square PNG/ICO used as the window/app icon. |

## `platforms.android`

| Field | Type | Notes |
|---|---|---|
| `enabled` | `boolean` | Must be `true` for `arkware android emit-flavor`. |
| `flavor` | `string` | Flavor name — becomes the `applicationIdSuffix` and the matrix entry `android-build.yml` needs. See [`android-flavor.md`](./android-flavor.md). |

This command doesn't build an APK regardless of this block; it only
controls what `emit-flavor` writes. Actual APK builds happen in CI on
`main`.

## `platforms.linux`

| Field | Type | Notes |
|---|---|---|
| `enabled` | `boolean` | Must be `true` for `arkware linux build`. **Defaults to `false`** — opt-in, since it needs a heavier local toolchain than `android emit-flavor`. See [`linux-shell.md`](./linux-shell.md#why-platformslinuxenabled-defaults-to-false). |
| `outDir` | `string` | Where the copied `linux-project` source (and its own `build/` output) is written. |

Not Neutralino-backed — there's no Neutralino anywhere in this
package. `arkware linux build` scaffolds and `cmake --build`s `main`'s
real native C shell. See [`linux-shell.md`](./linux-shell.md) for the
full picture, including what it needs installed locally (`cmake`,
`pkg-config`, GTK3/WebKitGTK dev packages).

## What reads what

`spa.targetUrl`, `spa.displayName`, `app.id`, and `app.version` are
validated by `loadConfig` itself and required no matter which command
you run. Beyond that:

| Command | `platforms.*` it needs |
|---|---|
| `arkware android emit-flavor` | `android.enabled`, `android.flavor` |
| `arkware linux build` | `linux.enabled` |

`app.icon` is optional and, if set, resolved relative to
`arkware.config.js`'s own directory.
