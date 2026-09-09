/*
 * ARKware -- Linux shell entry point.
 *
 * Per CODE-STYLE.md section 1: "a translation unit gets its own file
 * for the same reason a concern gets its own Kotlin package." main.c
 * owns exactly one thing -- wiring the other modules together in
 * order -- and nothing else. Config, window/lifecycle, bridge
 * bindings, and media each live in their own module; if this file
 * starts containing real logic for any of them, that logic has
 * drifted out of the module that should own it.
 */
#include <stdlib.h>

#include "config/config.h"
#include "logging/logging.h"
#include "media/media.h"
#include "shell/shell.h"
#include "webview_bridge/bridge.h"

#define ARK_MAIN_TAG "main"

int main(int argc, char **argv) {
  const char *config_path = (argc > 1) ? argv[1] : NULL;

  ark_log_info(ARK_MAIN_TAG, "ARKware Linux shell starting");

  ArkSpaConfig *config = ark_config_load(config_path);
  if (!config) {
    ark_log_error(ARK_MAIN_TAG,
                  "startup aborted: no target SPA configured (set "
                  "ARKWARE_TARGET_URL or provide an arkware.config file)");
    return EXIT_FAILURE;
  }

#ifndef NDEBUG
  const int debug = 1;
#else
  const int debug = 0;
#endif

  ArkShell *shell = ark_shell_create(config, debug);
  if (!shell) {
    ark_log_error(ARK_MAIN_TAG, "startup aborted: shell creation failed");
    ark_config_free(config);
    return EXIT_FAILURE;
  }

  ark_bridge_install(shell);
  ark_media_init();

  ark_shell_run(shell);

  ark_shell_destroy(shell);
  ark_config_free(config);

  ark_log_info(ARK_MAIN_TAG, "ARKware Linux shell exited cleanly");
  return EXIT_SUCCESS;
}
