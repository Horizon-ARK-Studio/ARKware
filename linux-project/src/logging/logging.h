/*
 * ARKware -- Linux shell logging convention
 *
 * CODE-STYLE.md section 3 carries ARKtube's ArkLogger convention over
 * to every runtime this project touches, because a JS-bridge or
 * background failure can go silent in ways that never surface as a
 * normal crash. This is the concrete v2 decision CODE-STYLE.md left
 * open ("the specific logging implementation for Linux isn't decided
 * yet -- that's a v2 decision once there's real bridge code to log
 * around"): now that webview_bridge/ exists, this is that decision.
 *
 * Shape: a single shared logging translation unit (the C equivalent
 * of ArkLogger's Kotlin `object` Singleton -- CODE-STYLE.md section 2's
 * named constraint is "reachable without threading a reference through
 * every function/module", and a linked-in .c file with static state
 * satisfies that the same way a Kotlin `object` does), reachable from
 * any module without a context parameter. No ceremony beyond that.
 */
#ifndef ARKWARE_LOGGING_H
#define ARKWARE_LOGGING_H

typedef enum {
  ARK_LOG_DEBUG = 0,
  ARK_LOG_INFO = 1,
  ARK_LOG_WARN = 2,
  ARK_LOG_ERROR = 3
} ArkLogLevel;

/* Every module that can fail silently -- the SPA-bridge boundary
 * above all, per CODE-STYLE.md section 3 -- logs through this instead
 * of ad hoc fprintf, so failure output has one consistent shape. */
void ark_log(ArkLogLevel level, const char *tag, const char *fmt, ...);

#define ark_log_debug(tag, ...) ark_log(ARK_LOG_DEBUG, (tag), __VA_ARGS__)
#define ark_log_info(tag, ...) ark_log(ARK_LOG_INFO, (tag), __VA_ARGS__)
#define ark_log_warn(tag, ...) ark_log(ARK_LOG_WARN, (tag), __VA_ARGS__)
#define ark_log_error(tag, ...) ark_log(ARK_LOG_ERROR, (tag), __VA_ARGS__)

#endif /* ARKWARE_LOGGING_H */
