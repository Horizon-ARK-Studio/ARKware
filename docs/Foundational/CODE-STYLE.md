# ARKware -- How We Write Code

**Status:** Living document
**Scope:** `android-project/` (Kotlin) and, once code exists, a
native C project per desktop platform -- `linux-project/` first

Same instinct as ARKtube's `CODE-STYLE.md`, carried over deliberately:
this isn't a brace-placement guide. It's the structural decisions
this codebase should keep making on purpose, so a change follows the
same shape instead of drifting toward one file that does everything
-- which is precisely the failure ARKtube's own `MainActivity.kt`
had to be refactored out of before its docs even existed.

---

## 1. One File, One Reason to Change

Unchanged from ARKtube: **a class/module exists because one thing can
change independently of everything else**, not because it was
convenient to keep adding to the file that was already open.

For the Android shell (v1), this means following ARKtube's own
package split directly -- `fullscreen/`, `webview/` (+ `bridge/`),
`media/`, `theme/`, `layout/`, `prefs/`, `logging/` -- generalized so
none of it hardcodes YouTube specifics. If a package's contents start
reading like "the YouTube version of X," that's the signal it still
has ARKtube-specific assumptions baked in that need to become
config-driven instead.

For the desktop shell, the same discipline applies even though C
doesn't enforce it structurally the way Kotlin classes do -- a
translation unit gets its own file for the same reason a concern gets
its own Kotlin package. Linux (v2) is the only desktop platform with a
real stage behind it, so this is the first cut, not a cross-platform
layout speculated ahead of any of it existing:

```
linux-project/
└── src/
    ├── main.c              -- entry point + wiring only
    ├── shell/                -- window chrome, tray, lifecycle (GTK)
    ├── webview_bridge/        -- SPA <-> native bridge (mirrors webview/bridge/)
    ├── media/                  -- OS media-session integration (MPRIS), if applicable
    ├── config/                  -- target-SPA configuration
    └── logging/                  -- shared logging convention, see Section 3
```

When Windows and macOS get their own stages, each gets its own project
directory (`windows-project/`, `macos-project/`) with this same shape
re-derived against that platform's actual constraints -- not a shared
`desktop-project/` with per-OS branches inside it. `webview_bridge/`
existing per-platform, each wrapping the same shell-facing bridge
concept ARKtube's `webview/bridge/` already proved on Android, is the
one convention worth carrying forward now; the rest of the layout is
free to diverge once a second platform's C code actually exists to
compare against.

---

## 2. Reach for a Pattern When It Names a Real Constraint, Not by Default

Same rule as ARKtube: a GoF pattern on the Kotlin side, or the closest
equivalent structural device C actually has (a function-pointer table
standing in for an interface, for instance), earns its place because
it's the accurate name for a constraint the code already hit -- never
because "that's how you'd structure this in general."

One constraint already known to apply, carried directly from
ARKtube's own reasoning:

* **A single global failure log, reachable without threading a
  reference through every function/module.** ARKtube used a Kotlin
  `object` Singleton for `ArkLogger` for exactly this reason. The C
  equivalent is a single shared logging translation unit, linked in
  wherever needed -- same justification, no ceremony beyond what the
  constraint actually calls for.

There isn't yet a known one-interface/many-implementations constraint
on the desktop side -- that was specifically the Neutralino
window-mode/chrome-mode split, and it no longer exists now that
desktop is one native C shell per platform rather than one shell with
two runtime modes. A Strategy-shaped need (a function-pointer table
behind a shared header, in C terms) may well resurface once a second
desktop platform's shell exists and turns out to share real logic with
Linux's -- that's exactly the kind of thing to name once it's actually
hit, not before. Any pattern gets added the same way: identify the
constraint first, name it after, not before.

---

## 3. Logging Convention

ARKtube's try/catch/finally + `ArkLogger` convention exists because a
WebView JS bridge or background service can fail silently in ways
that never surface as a normal crash. The same risk exists here,
across more runtimes:

* Android v1 reuses `ArkLogger`'s convention directly.
* Desktop v2 (Linux) needs an equivalent for its own most likely
  silent-failure point: the SPA-bridge boundary between the C shell
  and the embedded WebKitGTK view.

The specific logging implementation for Linux isn't decided yet --
that's a v2 decision once there's real bridge code to log around, not
a Stage 0 one.

---

## 4. This Document Grows With the Code, Not Ahead of It

Sections 1-3 cover what's already a known, real constraint (from
ARKtube's proven experience, or from the shape v2 already implies).
Anything else -- test conventions, build tooling specifics, a
concrete first cut at the desktop bridge's file layout -- gets
added here once v1/v2 code exists to derive it from, not speculated
into this document ahead of time. Consistent with `docs/README.md`'s
own philosophy: don't reach for structure the problem hasn't asked
for yet.
