# ARKware -- Roadmap

**Status:** Living document
**Scope:** whole project

`PROBLEM-STATEMENT.md` explains why ARKware is shaped the way it is.
This document says what has to be true, concretely, before a given
stage counts as done -- and just as importantly, what's deliberately
*not* attempted until then. Consistent with both projects' docs
philosophy: a stage that quietly grows scope mid-way is exactly the
kind of undocumented decision that looks like an accident later.

---

## v1 -- Android, native Kotlin shell

**Goal:** get the Android shell working with no outstanding issues,
generalized from ARKtube's proven pattern rather than YouTube-specific.

**In scope:**
* native Kotlin `WebView` shell, config-driven target SPA (not
  hardcoded to one site)
* everything ARKtube's Android build already proved: persistent
  `WebView` fullscreen handling, orientation lock to content shape,
  OS media-session integration, status/nav bar theming, rotation
  reflow -- reimplemented generically, not copy-pasted with the
  YouTube specifics left in
* GoF patterns where `CODE-STYLE.md` says one earns its place -- not
  by default

**Explicitly deferred:**
* anything desktop
* any SPA-provided native bridge/API beyond what ARKtube already
  needed (media state, title/artwork) -- see "Native bridge surface"
  below for candidates, none of them scheduled yet

**Done when (mirrors ARKtube `PROBLEM-STATEMENT.md` Section 12, generalized):**
* the shell installs, launches, and reaches a usable state for an
  arbitrary configured SPA noticeably faster than a heavy native
  rewrite would
* session/login state persists across restarts (whatever the SPA
  itself already persists via cookies/localStorage)
* fullscreen (where the SPA has a fullscreen affordance) reliably
  enters and stays entered -- no blink-and-revert
* rotation during fullscreen locks to content shape without breaking
  layout
* OS-level media controls correctly reflect and control real
  playback state, for SPAs that expose a `<video>`/`<audio>` element
* no outstanding entries in `bugs-caught/` for the Android shell

---

## v2 -- Desktop, Linux native C shell

**Goal:** desktop capability on Linux via a small, native C shell that
embeds WebKitGTK directly -- no Neutralino, no bundled runtime, no
dependency on system Chrome being installed. Desktop is no longer
staged as one cross-platform runtime with modes; it's one native shell
per OS, proven one at a time, and Linux is first because it's the
simplest case to establish the pattern on.

**In scope:**
* native C shell (GTK + WebKitGTK), same config-driven target-SPA
  model as v1 -- a config file or equivalent input names the target
  SPA, nothing about a specific SPA is hardcoded into the shell
* window chrome, tray integration, install/update mechanics --
  whatever a desktop user expects an installed app to have that a
  browser tab doesn't
* verification of which native affordances are actually missing from
  WebKitGTK's own web layer (see `PROBLEM-STATEMENT.md` Section 5) --
  checked against real WebKitGTK behavior, not assumed from Android
* applying `SYSTEM-DESIGN-AGREEMENTS.md`'s ownership test to WebKitGTK
  specifically, the same way it was applied to Android `WebView`

**Explicitly deferred:**
* Windows and macOS -- each is its own future, currently unstaged
  stage (see below), not a v3/v4 slot already committed to a shape
* any feature whose only known implementation path requires
  delegating to a system browser instead of the embedded webview --
  no such fallback mode is currently planned; it would only get added
  as its own stage, for a specific documented gap
* the "Native bridge surface" opt-in APIs listed below -- reference
  material for later, not v2 scope

**Done when:**
* the shell installs and runs on Linux via the native C shell
* session/login state persists across restarts (whatever the SPA
  itself already persists via cookies/localStorage)
* window chrome (resize, minimize/maximize, close, tray if
  applicable) behaves like a native app, not a browser window
* any native affordance gap found in WebKitGTK is documented (what's
  missing, why) before being worked around -- not patched blind
* no outstanding entries in `bugs-caught/` for the Linux shell

---

## Windows, macOS (desktop) -- not yet staged

No v3/v4 shape is committed to yet. Each will become its own numbered
stage, with its own "in scope"/"done when" breakdown derived from
real Linux findings and each platform's actual native webview (WebView2
on Windows, WKWebView on macOS), once v2 is far enough along to derive
useful lessons from -- not speculated into a plan ahead of that,
consistent with `CODE-STYLE.md` Section 4's own rule against reaching
for structure the problem hasn't asked for yet.

---

## Native bridge surface (opt-in) -- future reference, not yet scheduled

A reference list for a later stage, not committed to v2 or any other
numbered version yet. Capacitor exposes a broad set of native APIs to
the SPAs it shells; most of that surface is out of scope for ARKware's
"only what the web layer structurally can't reach itself" philosophy,
but a subset are genuinely native-only affordances (no web-platform
equivalent, or one with poor WebView/WebKitGTK support) that would fit
the same shell/bridge pattern the Android build already uses for media
state and orientation:

* **Splash screen** -- covers the load-time gap before the webview has
  content, same category as v1's existing fullscreen/rotation work.
* **Keyboard insets** -- resize/inset behavior for input-heavy SPAs,
  a real embedded-webview gap on both Android and desktop.
* **Push / local notifications** -- OS-level notification delivery a
  browser tab structurally can't do.
* **Share** -- native share sheet, more reliable than the Web Share
  API's inconsistent WebView support.
* **Haptics** -- no web equivalent at all.
* **Privacy screen** -- hides app content in the OS app-switcher/
  recents view, useful for SPAs handling sensitive data.
* **Browser / in-app browser** -- opening OAuth or external links
  without losing shell/session state.
* **Preferences** -- native key-value storage that survives a
  WebView/webview data-clear the way `localStorage` doesn't; the same
  role the Android `ForceFillPreference` flavor already plays manually
  for one setting.
* **App-state events** -- foreground/background and deep-link hooks,
  which would slot into the same bridge-package pattern
  (`webview/bridge/` on Android, `webview_bridge/` on desktop) as
  `MediaPlaybackBridge`, `OrientationBridge`, and `ThemeBridge`
  already do.

Each of these is opt-in per `arkware.config.js`-equivalent config, per
the project's existing "never require the SPA to know it's running
inside ARKware unless it asks" principle (`PROBLEM-STATEMENT.md`
Section 1). None of them get built speculatively; each becomes real
scope only once a specific stage's own roadmap section commits to it,
same as everything else in this document.

---

## Non-goal, permanently: iOS

Not a future v4. See `PROBLEM-STATEMENT.md` Section 3 for why this
is a scope boundary, not a backlog item.
