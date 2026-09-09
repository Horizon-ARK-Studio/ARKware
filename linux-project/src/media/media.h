/*
 * ARKware -- Linux media (OS media-session integration, e.g. MPRIS)
 *
 * Deliberately a stub. CODE-STYLE.md's directory layout lists media/
 * as part of v2's shape ("if applicable"), but neither ROADMAP.md's
 * v2 "in scope" list nor its "done when" bar requires OS
 * media-session integration to call Linux desktop done -- v1's
 * Android shell needed it because ARKtube's original pattern did;
 * v2 hasn't yet run WebKitGTK through SYSTEM-DESIGN-AGREEMENTS.md's
 * ownership test for media/audio focus the way v1 could cite
 * ARKtube's existing Android findings directly (SYSTEM-DESIGN-
 * AGREEMENTS.md: "v2's WebKitGTK findings ... still need to be run
 * through this test from scratch once there's real code to test each
 * against").
 *
 * This header exists so main.c's wiring reads the same shape as the
 * documented layout, and so a future MPRIS stage has an obvious file
 * to fill in -- not because there's real behavior here yet.
 */
#ifndef ARKWARE_MEDIA_H
#define ARKWARE_MEDIA_H

/* No-op today. Kept as a real call site in main.c's wiring so wiring
 * a real MPRIS integration later is a one-function change, not a
 * new call site threaded through main.c from scratch. */
void ark_media_init(void);

#endif /* ARKWARE_MEDIA_H */
