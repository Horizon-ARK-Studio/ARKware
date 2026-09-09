# ARKware

## A thin native shell for SPAs.

ARKware takes a single-page app and wraps it in exactly enough
native shell to make it look and feel like a real, installed app —
without rewriting it.

It looks like the app.

It behaves like an app.

No redesign.
No framework lock-in inside the SPA.
Just the SPA, with the native chrome a browser tab (or a heavier
runtime like Electron/Capacitor) doesn't give you for free.

---

## The idea

ARKtube proved the pattern once, specifically: wrap `m.youtube.com`
in a native Android shell, add real fullscreen, orientation lock,
and OS media-session integration, change nothing else.

ARKware is that pattern, generalized: point the shell at *any* SPA,
and give it only the native affordances the web layer structurally
can't reach itself.

```text
Any SPA
    +
the smallest native shell that fixes what the
web runtime can't (fullscreen, window chrome,
OS integration, media/session hooks)
    =
The SPA, installed.
```

---

## Platforms

| Stage | Platform | Shell | Status |
|---|---|---|---|
| **v1** | Android | Native Kotlin, `WebView` + GoF patterns where they earn their place | 🚧 working stage — code in, active testing |
| **v2** | Linux (desktop) | Native C shell, GTK + WebKitGTK embedding the OS's own webview — no bundled runtime | docs only |
| **v3+** | Windows, macOS (desktop) | Native C shell per platform, same discipline as Linux, engine/toolkit TBD per OS (WebView2 on Windows; WKWebView, which needs some Objective-C interop, on macOS) | not yet staged |

Desktop is no longer planned around Neutralino. Each desktop OS gets
its own small, native C shell instead of a shared cross-platform
runtime — see
[`docs/Foundational/PROBLEM-STATEMENT.md`](docs/Foundational/PROBLEM-STATEMENT.md#2-why-not-electron--capacitor--a-full-rewrite)
for why owning the shell/webview boundary directly, rather than sitting
on top of another abstraction layer, was already this project's
argument against Electron and Capacitor — Neutralino was the one
exception to that argument, and it no longer is one. Linux is first
because it's the simplest case to prove the pattern on before deciding
anything for Windows or macOS.

iOS is explicitly out of scope — see
[`docs/Foundational/PROBLEM-STATEMENT.md`](docs/Foundational/PROBLEM-STATEMENT.md#non-goals)
for why.

---

## Status

🚧 **v1 (Android) — working stage.** The native Kotlin `WebView`
shell has code and is in active testing against the "done when"
bar in [`docs/Foundational/ROADMAP.md`](docs/Foundational/ROADMAP.md#v1----android-native-kotlin-shell);
see [`android-project/`](android-project) and
[`docs/bugs-caught/README.md`](docs/bugs-caught/README.md) for what's
still outstanding before v1 is called done. Desktop (v2+) remains
docs-only, and is now planned as a native C shell per platform
(Linux first) instead of Neutralino — see the Platforms table above
and [`docs/Foundational/ROADMAP.md`](docs/Foundational/ROADMAP.md) for
the current staging. See [`docs/README.md`](docs/README.md) for the
full index.

An npm packaging + CLI layer for this project also exists on the
[`npm` branch](https://github.com/Horizon-ARK-Studio/ARKware/tree/npm)
(`@horizon-ark-studio/arkware`) — a separate ecosystem-specific
distribution layer, not a second copy of this code; see that branch's
README for how it stays in sync with `main`. That branch's CLIs
currently target Neutralino for desktop packaging, which now diverges
from `main`'s direction above — reconciling that is follow-up work on
the `npm` branch itself, not done as part of this change.

---

## License

[GNU General Public License v3.0](LICENSE) (GPL-3.0-or-later). ARKware
ships no code or assets belonging to any SPA it shells — it is a
generic native shell, not a redistribution of anything it points at.
