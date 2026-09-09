#include "logging.h"

#include <stdarg.h>
#include <stdio.h>
#include <time.h>

static const char *level_label(ArkLogLevel level) {
  switch (level) {
  case ARK_LOG_DEBUG:
    return "DEBUG";
  case ARK_LOG_INFO:
    return "INFO";
  case ARK_LOG_WARN:
    return "WARN";
  case ARK_LOG_ERROR:
    return "ERROR";
  default:
    return "?";
  }
}

/* stderr, not stdout: keeps shell diagnostics separate from anything
 * the process might legitimately write to stdout, and matches how
 * ARKtube treats ArkLogger output as failure-reporting, not normal
 * program output. */
void ark_log(ArkLogLevel level, const char *tag, const char *fmt, ...) {
  char timestamp[32];
  time_t now = time(NULL);
  struct tm tm_now;
  localtime_r(&now, &tm_now);
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &tm_now);

  fprintf(stderr, "[%s] %-5s [%s] ", timestamp, level_label(level),
          tag ? tag : "arkware");

  va_list args;
  va_start(args, fmt);
  vfprintf(stderr, fmt, args);
  va_end(args);

  fprintf(stderr, "\n");
  fflush(stderr);
}
