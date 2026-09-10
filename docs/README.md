# `@horizon-ark-studio/arkware` docs

Documentation for this branch only — the npm packaging + CLI layer
around ARKware. For the Android app, design docs, and the license
canon, see [`main`](https://github.com/Horizon-ARK-Studio/ARKware/tree/main/docs).

| Doc | Covers |
|---|---|
| [`getting-started.md`](./getting-started.md) | Install, write `arkware.config.js`, run your first command |
| [`cli-reference.md`](./cli-reference.md) | Every command and flag for the single `arkware` CLI |
| [`config-reference.md`](./config-reference.md) | Every `arkware.config.js` field, what reads it, defaults |
| [`sync-and-versioning.md`](./sync-and-versioning.md) | How `arkware-runtime.json` pins `main`, and how to bump it |
| [`android-flavor.md`](./android-flavor.md) | Turning a config into a Gradle flavor CI can build |
| [`linux-shell.md`](./linux-shell.md) | `arkware linux build`: building main's real native C shell (GTK + WebKitGTK) |
| [`publishing.md`](./publishing.md) | The OIDC Trusted Publishing flow this package ships under |

If you're looking for the native Linux shell's own internals, the
GTK/WebKitGTK build itself, or the Android WebView shell this package
generalizes, that lives in `main`, not here — see the root
[README](../README.md#where-the-code-actually-lives) for why the
split exists. There's no Neutralino anywhere in this package — `main`
settled on one native C shell per desktop OS, and this branch tracks
that.
