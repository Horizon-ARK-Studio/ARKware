// ARKware -- webview.h implementation unit.
//
// vendor/webview.h is a header-only C/C++ library whose actual
// implementation is C++ (it wraps GTK+WebKitGTK via C++ bindings on
// Linux). This translation unit is the one place that compiles as
// C++ and pulls in that implementation, exposed through a plain C
// ABI (WEBVIEW_API = extern "C") -- everywhere else in linux-project/
// is C, including main.c, and includes vendor/webview.h with
// WEBVIEW_HEADER defined so it only sees declarations, never this
// implementation. This keeps the "native C shell" CODE-STYLE.md
// describes accurate: application logic here is C, and this single
// vendored dependency's C++ internals stay contained to one file
// nothing else needs to know about.
#define WEBVIEW_API extern "C"
#include "../vendor/webview.h"
