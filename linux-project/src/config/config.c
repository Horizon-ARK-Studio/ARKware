#include "config.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../logging/logging.h"

#define ARK_CONFIG_TAG "config"
#define ARK_CONFIG_DEFAULT_PATH "arkware.config"
#define ARK_CONFIG_MAX_LIST_ITEMS 64

static char *ark_strdup(const char *s) {
  if (!s) {
    return NULL;
  }
  size_t len = strlen(s) + 1;
  char *copy = (char *)malloc(len);
  if (copy) {
    memcpy(copy, s, len);
  }
  return copy;
}

static char *trim(char *s) {
  while (*s == ' ' || *s == '\t') {
    s++;
  }
  char *end = s + strlen(s);
  while (end > s && (end[-1] == ' ' || end[-1] == '\t' || end[-1] == '\r' ||
                      end[-1] == '\n')) {
    end--;
  }
  *end = '\0';
  return s;
}

/* Splits a comma-separated raw value into a heap-allocated array of
 * heap-allocated strings, same "empty means no entries" convention
 * SpaConfig.kt's splitConfigList uses -- a field left blank in the
 * config file means "nothing configured", not one empty-string entry. */
static char **split_list(const char *raw, int *out_count) {
  *out_count = 0;
  if (!raw || raw[0] == '\0') {
    return NULL;
  }

  char **items = (char **)calloc(ARK_CONFIG_MAX_LIST_ITEMS, sizeof(char *));
  if (!items) {
    return NULL;
  }

  char *copy = ark_strdup(raw);
  char *cursor = copy;
  int count = 0;
  while (cursor && count < ARK_CONFIG_MAX_LIST_ITEMS) {
    char *comma = strchr(cursor, ',');
    if (comma) {
      *comma = '\0';
    }
    char *piece = trim(cursor);
    if (piece[0] != '\0') {
      items[count++] = ark_strdup(piece);
    }
    cursor = comma ? comma + 1 : NULL;
  }
  free(copy);

  *out_count = count;
  return items;
}

static void free_list(char **items, int count) {
  if (!items) {
    return;
  }
  for (int i = 0; i < count; i++) {
    free(items[i]);
  }
  free(items);
}

/* Reads one KEY=value file into a fixed set of known keys. Unknown
 * keys are ignored rather than rejected -- a forward-compatible
 * config file with a field this build doesn't understand yet should
 * still load, not fail. */
static void read_config_file(const char *path, char **out_target_url,
                              char **out_display_name,
                              char **out_nag_selectors_raw,
                              char **out_nag_text_matches_raw) {
  FILE *f = fopen(path, "r");
  if (!f) {
    ark_log_info(ARK_CONFIG_TAG,
                 "no config file at '%s' (this is fine if env vars "
                 "already supplied everything needed)",
                 path);
    return;
  }

  char line[1024];
  while (fgets(line, sizeof(line), f)) {
    char *l = trim(line);
    if (l[0] == '\0' || l[0] == '#') {
      continue;
    }
    char *eq = strchr(l, '=');
    if (!eq) {
      continue;
    }
    *eq = '\0';
    char *key = trim(l);
    char *value = trim(eq + 1);

    if (strcmp(key, "target_url") == 0) {
      *out_target_url = ark_strdup(value);
    } else if (strcmp(key, "display_name") == 0) {
      *out_display_name = ark_strdup(value);
    } else if (strcmp(key, "nag_hide_selectors") == 0) {
      *out_nag_selectors_raw = ark_strdup(value);
    } else if (strcmp(key, "nag_hide_text_matches") == 0) {
      *out_nag_text_matches_raw = ark_strdup(value);
    }
  }

  fclose(f);
}

ArkSpaConfig *ark_config_load(const char *path) {
  char *target_url = NULL;
  char *display_name = NULL;
  char *nag_selectors_raw = NULL;
  char *nag_text_matches_raw = NULL;

  read_config_file(path ? path : ARK_CONFIG_DEFAULT_PATH, &target_url,
                    &display_name, &nag_selectors_raw, &nag_text_matches_raw);

  /* Env vars win over the file -- deliberate override path for
   * testing a second SPA without editing arkware.config. */
  const char *env_url = getenv("ARKWARE_TARGET_URL");
  if (env_url && env_url[0] != '\0') {
    free(target_url);
    target_url = ark_strdup(env_url);
  }
  const char *env_name = getenv("ARKWARE_DISPLAY_NAME");
  if (env_name && env_name[0] != '\0') {
    free(display_name);
    display_name = ark_strdup(env_name);
  }

  if (!target_url || target_url[0] == '\0') {
    ark_log_error(ARK_CONFIG_TAG,
                  "no target_url resolved from config file or "
                  "ARKWARE_TARGET_URL -- nothing to point the shell at");
    free(target_url);
    free(display_name);
    free(nag_selectors_raw);
    free(nag_text_matches_raw);
    return NULL;
  }

  if (!display_name || display_name[0] == '\0') {
    free(display_name);
    display_name = ark_strdup("ARKware");
  }

  ArkSpaConfig *config = (ArkSpaConfig *)calloc(1, sizeof(ArkSpaConfig));
  config->target_url = target_url;
  config->display_name = display_name;
  config->nag_hide_selectors =
      split_list(nag_selectors_raw, &config->nag_hide_selectors_count);
  config->nag_hide_text_matches = split_list(
      nag_text_matches_raw, &config->nag_hide_text_matches_count);

  free(nag_selectors_raw);
  free(nag_text_matches_raw);

  ark_log_info(ARK_CONFIG_TAG, "loaded config: target_url='%s' display_name='%s'",
               config->target_url, config->display_name);

  return config;
}

void ark_config_free(ArkSpaConfig *config) {
  if (!config) {
    return;
  }
  free(config->target_url);
  free(config->display_name);
  free_list(config->nag_hide_selectors, config->nag_hide_selectors_count);
  free_list(config->nag_hide_text_matches, config->nag_hide_text_matches_count);
  free(config);
}
