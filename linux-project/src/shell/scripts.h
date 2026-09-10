/*
 * ARKware -- Linux shell injected JS
 *
 * The C-shell counterpart to android-project's ArkScripts.kt: every
 * piece of JS this shell injects into the target SPA, in one place,
 * kept separate from shell.c for the same "one file, one reason to
 * change" reason CODE-STYLE.md gives ArkScripts.kt its own file on
 * Android -- window chrome/lifecycle (shell.c) changes for different
 * reasons than the content of an injected script does.
 */
#ifndef ARKWARE_SCRIPTS_H
#define ARKWARE_SCRIPTS_H

/*
 * Builds the JS that shows/hides a full-screen offline-fallback
 * overlay, reactive to the browser's own `online`/`offline` events --
 * no native GTK/ConnectivityManager-equivalent network polling
 * involved, same as the Android counterpart
 * (ArkScripts.offlineOverlayJs). Also installs
 * `window.__arkShowOfflineOverlay()` / `window.__arkHideOfflineOverlay()`
 * so shell.c's WebKitGTK load-failure handling can force the overlay
 * on for the "URL never loaded at all" case that `online`/`offline`
 * events alone don't cover.
 *
 * svg_data_uri is dropped as-is into an <img src="...">, generally a
 * `data:image/svg+xml,...` URI but any valid <img> src works -- the
 * value comes from ArkSpaConfig.offline_fallback_svg, i.e. whatever
 * this build's arkware.config sets it to.
 *
 * Returns a heap-allocated string the caller must free(), or NULL if
 * svg_data_uri is NULL/empty -- a harmless no-op, same convention
 * ArkScripts.nagHideJs uses for an SPA with nothing configured.
 */
char *ark_scripts_offline_overlay_js(const char *svg_data_uri);

#endif /* ARKWARE_SCRIPTS_H */
