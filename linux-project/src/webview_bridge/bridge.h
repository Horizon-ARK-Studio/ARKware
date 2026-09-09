/*
 * ARKware -- Linux webview_bridge
 *
 * The desktop counterpart to android-project's webview/bridge/
 * package (CODE-STYLE.md's one named cross-platform convention: a
 * webview_bridge/ per platform, each wrapping the same shell-facing
 * bridge concept). This first cut deliberately exposes nothing
 * SPA-specific -- ROADMAP.md's "Native bridge surface" list (media
 * state, splash screen, notifications, etc.) is explicit that none of
 * those opt-in APIs are v2 scope yet. What v2 needs is the bridge
 * *mechanism* itself, proven with one trivial, harmless binding
 * (arkwareBridgeReady) so the real opt-in APIs have a working,
 * logged boundary to land on once a stage actually commits to one.
 *
 * Per CODE-STYLE.md section 3, every call across this boundary is
 * logged (success and failure) -- this is the module that convention
 * exists for.
 */
#ifndef ARKWARE_WEBVIEW_BRIDGE_H
#define ARKWARE_WEBVIEW_BRIDGE_H

#include "../shell/shell.h"

/* Registers all native->JS bindings this build of the shell exposes.
 * Call once, after ark_shell_create() and before ark_shell_run(). */
void ark_bridge_install(ArkShell *shell);

#endif /* ARKWARE_WEBVIEW_BRIDGE_H */
