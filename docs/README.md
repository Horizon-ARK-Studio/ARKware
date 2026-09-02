# `@horizon-ark-studio/arkware` docs

Documentation for this branch only — the npm packaging + CLI layer
around ARKware. For the Android app, design docs, and the license
canon, see [`main`](https://github.com/Horizon-ARK-Studio/ARKware/tree/main/docs).

| Doc | Covers |
|---|---|
| [`getting-started.md`](./getting-started.md) | Install, write `arkware.config.js`, run your first `build` |
| [`cli-reference.md`](./cli-reference.md) | Every command and flag for `arkware-shell` and `arkware-spa` |
| [`config-reference.md`](./config-reference.md) | Every `arkware.config.js` field, what reads it, defaults |
| [`sync-and-versioning.md`](./sync-and-versioning.md) | How `arkware-runtime.json` pins `main`, and how to bump it |
| [`android-flavor.md`](./android-flavor.md) | Turning a config into a Gradle flavor CI can build |
| [`publishing.md`](./publishing.md) | The OIDC Trusted Publishing flow this package ships under |

If you're looking for the Neutralino shell internals, `neu build`
behavior, or the Android WebView shell this package generalizes,
that lives in `main`, not here — see the root [README](../README.md#where-the-code-actually-lives)
for why the split exists.
