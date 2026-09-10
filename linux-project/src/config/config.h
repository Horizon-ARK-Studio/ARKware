/*
 * ARKware -- Linux target-SPA configuration
 *
 * The C-shell counterpart to android-project's SpaConfig.kt: the
 * single place that reads the values naming *this* build's target
 * SPA. Nothing outside this file should reach into the raw config
 * file or environment directly, and nothing outside a config file
 * should hardcode a URL, display name, or DOM selector belonging to
 * a specific SPA -- same discipline ROADMAP.md's v1 section requires
 * of the Android flavor split, applied here to a config file instead
 * of Gradle product flavors, since v2 has no per-SPA build-flavor
 * mechanism yet (a config-driven single build, per ROADMAP.md's v2
 * "in scope" line: "a config file or equivalent input names the
 * target SPA, nothing about a specific SPA is hardcoded into the
 * shell").
 *
 * Format decision: a flat `KEY=value` file (see arkware.config.example),
 * not JSON -- v2 explicitly has "no bundled runtime" as a goal, and
 * pulling in a JSON dependency for four flat string/list fields would
 * cut against that with nothing gained. Multi-value fields
 * (nag_hide_selectors, nag_hide_text_matches) are comma-separated,
 * same convention SpaConfig.kt's splitConfigList already uses.
 */
#ifndef ARKWARE_CONFIG_H
#define ARKWARE_CONFIG_H

typedef struct {
  char *target_url;
  char *display_name;
  char **nag_hide_selectors;
  int nag_hide_selectors_count;
  char **nag_hide_text_matches;
  int nag_hide_text_matches_count;
  /* Optional. An SVG (typically a `data:image/svg+xml,...` URI, but
   * any value webview_bridge's JS can drop straight into an <img src>
   * is fine) shown full-screen over the page while the browser
   * considers the connection offline. NULL/empty means "don't inject
   * an offline overlay for this SPA at all" -- same opt-in convention
   * nag_hide_selectors/nag_hide_text_matches already use, and the
   * same field name Android's SpaConfig.offlineFallbackSvg uses, so
   * the two shells document this the same way even though they don't
   * share code. Not comma-split like the nag_hide_* fields -- this is
   * a single value, not a list. */
  char *offline_fallback_svg;
} ArkSpaConfig;

/*
 * Loads config from (in order of precedence):
 *   1. ARKWARE_TARGET_URL / ARKWARE_DISPLAY_NAME env vars, if set --
 *      quick per-run overrides, e.g. for testing a second SPA without
 *      editing the file.
 *   2. The config file at path (or "arkware.config" in the working
 *      directory if path is NULL).
 *
 * Returns a heap-allocated ArkSpaConfig the caller owns and must pass
 * to ark_config_free(), or NULL if no target_url could be resolved
 * from either source -- that's a fatal condition for the shell, since
 * "point the shell at any SPA" has nothing to point at otherwise.
 */
ArkSpaConfig *ark_config_load(const char *path);

void ark_config_free(ArkSpaConfig *config);

#endif /* ARKWARE_CONFIG_H */
