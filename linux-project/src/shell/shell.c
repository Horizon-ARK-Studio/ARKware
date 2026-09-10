#define WEBVIEW_HEADER
#include "../../vendor/webview.h"

#include "shell.h"

#include <stdlib.h>

#include "../logging/logging.h"
#include "scripts.h"

#define ARK_SHELL_TAG "shell"

/* Reasonable defaults for a first-launch window; not persisted yet --
 * per-SPA remembered geometry is exactly the kind of thing that
 * belongs in the Preferences entry in ROADMAP.md's "Native bridge
 * surface" list once that stage is actually scheduled, not
 * speculated into v2. */
#define ARK_SHELL_DEFAULT_WIDTH 1200
#define ARK_SHELL_DEFAULT_HEIGHT 800

struct ArkShell {
  webview_t handle;
};

ArkShell *ark_shell_create(const ArkSpaConfig *config, int debug) {
  if (!config || !config->target_url) {
    ark_log_error(ARK_SHELL_TAG, "cannot create shell without a target_url");
    return NULL;
  }

  webview_t handle = webview_create(debug, NULL);
  if (!handle) {
    ark_log_error(ARK_SHELL_TAG,
                  "webview_create failed -- is WebKitGTK installed?");
    return NULL;
  }

  webview_error_t err = webview_set_title(handle, config->display_name);
  if (err != WEBVIEW_ERROR_OK) {
    ark_log_warn(ARK_SHELL_TAG, "webview_set_title failed (code %d)", err);
  }

  /* WEBVIEW_HINT_NONE: resizable, GTK-managed window chrome -- the
   * ownership-test comment in shell.h is why this isn't
   * WEBVIEW_HINT_FIXED or anything hand-rolled. */
  err = webview_set_size(handle, ARK_SHELL_DEFAULT_WIDTH,
                          ARK_SHELL_DEFAULT_HEIGHT, WEBVIEW_HINT_NONE);
  if (err != WEBVIEW_ERROR_OK) {
    ark_log_warn(ARK_SHELL_TAG, "webview_set_size failed (code %d)", err);
  }

  /* webview_init() must run before webview_navigate() -- it installs
   * the script to run on every subsequent page load, it doesn't
   * retroactively run on one already loading. This is also this
   * shell's first use of webview_init() at all: unlike Android's
   * nagHideJs/evaluateJavascript precedent, nothing was injected here
   * before the offline overlay.
   *
   * Reactive to the browser's own online/offline events only -- no
   * native GTK network-state polling for this base case (see
   * scripts.h). That covers "connection dropped after the page
   * loaded"; it does NOT cover "the initial webview_navigate() below
   * never reaches a server at all" (no connection at launch), since
   * webview.h exposes no load-failure/error callback the way
   * Android's WebViewClient.onReceivedError does -- webview_navigate's
   * return code below only reports whether the call itself was
   * well-formed, not whether the page actually loaded. Catching that
   * case would mean reaching past webview.h into WebKitGTK's own
   * signals directly (e.g. WebKitWebView's "load-failed"), which is a
   * genuinely new dependency this shell doesn't have yet -- left as a
   * follow-up, not assumed to already work. */
  if (config->offline_fallback_svg) {
    char *offline_overlay_js =
        ark_scripts_offline_overlay_js(config->offline_fallback_svg);
    if (offline_overlay_js) {
      err = webview_init(handle, offline_overlay_js);
      if (err != WEBVIEW_ERROR_OK) {
        ark_log_warn(ARK_SHELL_TAG,
                     "webview_init (offline overlay) failed (code %d)", err);
      }
      free(offline_overlay_js);
    } else {
      ark_log_warn(ARK_SHELL_TAG,
                   "failed to build offline overlay JS -- skipping");
    }
  }

  err = webview_navigate(handle, config->target_url);
  if (err != WEBVIEW_ERROR_OK) {
    ark_log_error(ARK_SHELL_TAG, "webview_navigate to '%s' failed (code %d)",
                  config->target_url, err);
    webview_destroy(handle);
    return NULL;
  }

  ArkShell *shell = (ArkShell *)calloc(1, sizeof(ArkShell));
  shell->handle = handle;

  ark_log_info(ARK_SHELL_TAG, "shell created for '%s'", config->target_url);
  return shell;
}

void ark_shell_bind(ArkShell *shell, const char *js_function_name,
                     void (*handler)(const char *id, const char *req,
                                     void *arg),
                     void *arg) {
  if (!shell || !shell->handle) {
    ark_log_error(ARK_SHELL_TAG, "ark_shell_bind called before shell exists");
    return;
  }
  webview_error_t err =
      webview_bind(shell->handle, js_function_name, handler, arg);
  if (err != WEBVIEW_ERROR_OK) {
    ark_log_error(ARK_SHELL_TAG, "webview_bind('%s') failed (code %d)",
                  js_function_name, err);
  }
}

void ark_shell_run(ArkShell *shell) {
  if (!shell || !shell->handle) {
    return;
  }
  ark_log_info(ARK_SHELL_TAG, "entering main loop");
  webview_run(shell->handle);
}

void ark_shell_destroy(ArkShell *shell) {
  if (!shell) {
    return;
  }
  if (shell->handle) {
    webview_destroy(shell->handle);
  }
  free(shell);
  ark_log_info(ARK_SHELL_TAG, "shell destroyed");
}

void *ark_shell_native_handle(ArkShell *shell) {
  return shell ? shell->handle : NULL;
}
