#include "scripts.h"

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Minimal JS single-quoted string-literal escaping for a value
 * sourced from arkware.config -- same two characters
 * ArkScripts.kt's jsStringLiteral() escapes on the Android side
 * (backslash first, so a literal backslash in the input doesn't turn
 * an escaped quote that follows it into an unescaped one). Returns a
 * heap-allocated string the caller must free(). */
static char *js_string_literal(const char *value) {
  if (!value) {
    value = "";
  }

  size_t extra = 0;
  for (const char *p = value; *p; p++) {
    if (*p == '\\' || *p == '\'') {
      extra++;
    }
  }

  size_t len = strlen(value);
  char *out = (char *)malloc(len + extra + 1);
  if (!out) {
    return NULL;
  }

  char *w = out;
  for (const char *p = value; *p; p++) {
    if (*p == '\\' || *p == '\'') {
      *w++ = '\\';
    }
    *w++ = *p;
  }
  *w = '\0';
  return out;
}

/* Formats into a freshly heap-allocated buffer sized exactly to the
 * result -- a portable (C99, no _GNU_SOURCE/vasprintf dependency)
 * stand-in for asprintf, since nothing else in this codebase pulls in
 * that GNU extension yet. Returns NULL on allocation failure. */
static char *heap_sprintf(const char *fmt, ...) {
  va_list args;
  va_start(args, fmt);
  va_list args_copy;
  va_copy(args_copy, args);
  int needed = vsnprintf(NULL, 0, fmt, args_copy);
  va_end(args_copy);
  if (needed < 0) {
    va_end(args);
    return NULL;
  }

  char *buf = (char *)malloc((size_t)needed + 1);
  if (buf) {
    vsnprintf(buf, (size_t)needed + 1, fmt, args);
  }
  va_end(args);
  return buf;
}

char *ark_scripts_offline_overlay_js(const char *svg_data_uri) {
  if (!svg_data_uri || svg_data_uri[0] == '\0') {
    return NULL;
  }

  char *svg_literal = js_string_literal(svg_data_uri);
  if (!svg_literal) {
    return NULL;
  }

  /* Structurally the same shape as Android's offlineOverlayJs: a
   * full-screen <img> overlay, shown/hidden purely off the browser's
   * own `online`/`offline` DOM events -- no native connectivity API
   * on either platform for this base case. __arkShowOfflineOverlay /
   * __arkHideOfflineOverlay are also exposed on `window` so shell.c's
   * WebKitGTK load-failure handling (the "URL never loaded at all"
   * case those two events alone don't cover) can force the overlay on
   * without duplicating this logic. */
  const char *js_fmt =
      "(function() {\n"
      "  if (window.__arkOfflineOverlayInstalled) { return; }\n"
      "  window.__arkOfflineOverlayInstalled = true;\n"
      "\n"
      "  var OVERLAY_ID = 'ark-offline-overlay';\n"
      "  var SVG_SRC = '%s';\n"
      "\n"
      "  function ensureOverlay() {\n"
      "    var el = document.getElementById(OVERLAY_ID);\n"
      "    if (el) { return el; }\n"
      "    el = document.createElement('div');\n"
      "    el.id = OVERLAY_ID;\n"
      "    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;'\n"
      "      + 'display:none;align-items:center;justify-content:center;background:#000;';\n"
      "    var img = document.createElement('img');\n"
      "    img.src = SVG_SRC;\n"
      "    img.style.cssText = 'max-width:60%%;max-height:60%%;';\n"
      "    el.appendChild(img);\n"
      "    (document.body || document.documentElement).appendChild(el);\n"
      "    return el;\n"
      "  }\n"
      "\n"
      "  window.__arkShowOfflineOverlay = function() {\n"
      "    ensureOverlay().style.display = 'flex';\n"
      "  };\n"
      "  window.__arkHideOfflineOverlay = function() {\n"
      "    ensureOverlay().style.display = 'none';\n"
      "  };\n"
      "\n"
      "  window.addEventListener('offline', window.__arkShowOfflineOverlay);\n"
      "  window.addEventListener('online', window.__arkHideOfflineOverlay);\n"
      "\n"
      "  function checkInitialState() {\n"
      "    if (navigator.onLine === false) {\n"
      "      window.__arkShowOfflineOverlay();\n"
      "    }\n"
      "  }\n"
      "  if (document.readyState === 'loading') {\n"
      "    document.addEventListener('DOMContentLoaded', checkInitialState);\n"
      "  } else {\n"
      "    checkInitialState();\n"
      "  }\n"
      "})();\n";

  char *js = heap_sprintf(js_fmt, svg_literal);
  free(svg_literal);
  return js;
}
