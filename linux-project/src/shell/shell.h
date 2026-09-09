/*
 * ARKware -- Linux shell (window chrome + lifecycle)
 *
 * Wraps webview.h (vendor/webview.h, the amalgamated upstream
 * https://github.com/webview/webview single header), which on Linux
 * embeds WebKitGTK via a GTK window itself -- this satisfies
 * ROADMAP.md's v2 "in scope" line ("native C shell (GTK +
 * WebKitGTK) ... no bundled runtime, no dependency on system Chrome
 * being installed") without this project hand-rolling GTK/WebKitGTK
 * plumbing that webview.h has already solved: it's a thin C wrapper
 * over the OS's own WebKitGTK, not a bundled browser runtime.
 *
 * SYSTEM-DESIGN-AGREEMENTS.md's ownership test applies here first,
 * before any bug gets found the hard way: window chrome (resize,
 * min/max, close, title) is requested through webview_set_size() /
 * webview_set_title(), which delegate straight to GTK's own window
 * management -- this shell never independently tracks or restores
 * window geometry itself, because GTK already owns that state.
 * Fullscreen/media/orientation ownership questions don't apply yet;
 * v2's "done when" bar (ROADMAP.md) doesn't require them, and they'd
 * each need their own ownership-test pass against WebKitGTK's actual
 * behavior before any shell code touched them -- not assumed from
 * Android's WebView answers, per SYSTEM-DESIGN-AGREEMENTS.md's
 * "why this doesn't port for free" section.
 */
#ifndef ARKWARE_SHELL_H
#define ARKWARE_SHELL_H

#include "../config/config.h"

typedef struct ArkShell ArkShell;

/* Creates the shell window and points it at config->target_url.
 * Ownership of config is NOT taken -- the caller still owns and must
 * free it after ark_shell_destroy(). Returns NULL on failure (logged
 * via ark_log_error before returning). */
ArkShell *ark_shell_create(const ArkSpaConfig *config, int debug);

/* Registers native bindings the webview_bridge module wants to
 * expose to the SPA. Must be called before ark_shell_run(). */
void ark_shell_bind(ArkShell *shell, const char *js_function_name,
                     void (*handler)(const char *id, const char *req,
                                     void *arg),
                     void *arg);

/* Blocks running the GTK main loop until the window closes. */
void ark_shell_run(ArkShell *shell);

void ark_shell_destroy(ArkShell *shell);

/* Exposed so webview_bridge/ can call webview_eval()/webview_return()
 * against the same underlying instance without this header leaking
 * webview.h's webview_t type into every other module's includes. */
void *ark_shell_native_handle(ArkShell *shell);

#endif /* ARKWARE_SHELL_H */
