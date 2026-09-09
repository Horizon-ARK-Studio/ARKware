#define WEBVIEW_HEADER
#include "../../vendor/webview.h"

#include "bridge.h"

#include "../logging/logging.h"

#define ARK_BRIDGE_TAG "webview_bridge"

/*
 * arkwareBridgeReady(): the one binding this first cut exposes to the
 * SPA. It takes no meaningful arguments and returns a small JSON
 * object confirming the native bridge is live -- SPAs that want to
 * detect "am I running inside ARKware" (PROBLEM-STATEMENT.md section
 * 1's "never require the SPA to know it's running inside ARKware
 * unless it asks" -- this is the "unless it asks" path) can call
 * `window.arkwareBridgeReady()` and get a real answer instead of
 * probing for ARKware-specific globals.
 *
 * req/id are unused: this binding takes no arguments and every call
 * gets the same reply, but the handler still logs each invocation so
 * a bridge failure (should one ever occur here) doesn't fail silently
 * -- exactly the risk CODE-STYLE.md section 3 calls out.
 */
static void handle_bridge_ready(const char *id, const char *req, void *arg) {
  (void)req;
  ArkShell *shell = (ArkShell *)arg;
  webview_t handle = (webview_t)ark_shell_native_handle(shell);

  ark_log_debug(ARK_BRIDGE_TAG, "arkwareBridgeReady() called (id=%s)", id);

  webview_error_t err =
      webview_return(handle, id, 0, "{\"ready\":true,\"shell\":\"linux\"}");
  if (err != WEBVIEW_ERROR_OK) {
    ark_log_error(ARK_BRIDGE_TAG,
                  "webview_return for arkwareBridgeReady failed (code %d)",
                  err);
  }
}

void ark_bridge_install(ArkShell *shell) {
  ark_shell_bind(shell, "arkwareBridgeReady", handle_bridge_ready, shell);
  ark_log_info(ARK_BRIDGE_TAG, "installed: arkwareBridgeReady");
}
