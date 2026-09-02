# `arkware.config.js` reference

The single file both CLIs read. Copy
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

| Field | Type | Used by | Notes |
|---|---|---|---|
| `targetUrl` | `string` | `arkware-shell` | Live URL the native window points at. Required for `arkware-shell build`. Ignored by `arkware-spa`. |
| `buildDir` | `string` | `arkware-spa` | Local directory of your SPA's already-built static output (e.g. `./dist`). Required for `arkware-spa build`. Ignored by `arkware-shell`. |
| `displayName` | `string` | both | Window titles, the Android media notification's subtitle/artist field, generated app metadata. |
| `nagHideSelectors` | `string[]` | both (passed through to Android flavor emission) | CSS selectors for an "open our app" nag banner to hide, if the SPA has one. Mirrors `SpaConfig.kt` on the Android side. Empty by default — arkware won't guess selectors for you. |
| `nagHideTextMatches` | `string[]` | both | Same purpose as above, matched by text content instead of selector. |

## `app`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Reverse-DNS id. Becomes the Neutralino `applicationId` and, on the Android side, an `applicationIdSuffix` of `.{platforms.android.flavor}` off `com.horizonarkstudio.arkware` — same convention as the existing `youtube`/`template` flavors. |
| `version` | `string` | App version string. |
| `icon` | `string` | Path to a square PNG/ICO used as the window/app icon. |

## `platforms.desktop`

| Field | Type | Notes |
|---|---|---|
| `enabled` | `boolean` | Must be `true` for either CLI's `build` command to run. |
| `outDir` | `string` | Where the scaffolded Neutralino project (and `neu build`'s own output) is written. |

## `platforms.android`

| Field | Type | Notes |
|---|---|---|
| `enabled` | `boolean` | Must be `true` for `arkware-shell emit-android-flavor`. |
| `flavor` | `string` | Flavor name — becomes the `applicationIdSuffix` and the matrix entry `android-build.yml` needs. See [`android-flavor.md`](./android-flavor.md). |

Neither CLI builds an APK regardless of this block; it only controls
what `emit-android-flavor` writes. Actual APK builds happen in CI on
`main`.

## What reads what

| Command | `spa.*` fields it needs | `platforms.*` it needs |
|---|---|---|
| `arkware-shell build` | `targetUrl` | `desktop.enabled` |
| `arkware-shell emit-android-flavor` | (none required) | `android.enabled`, `android.flavor` |
| `arkware-spa build` | `buildDir` | `desktop.enabled` |

`app.*` fields are read by every command that scaffolds or emits
output, since they identify the app regardless of platform.
