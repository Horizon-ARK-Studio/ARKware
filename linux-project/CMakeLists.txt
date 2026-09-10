cmake_minimum_required(VERSION 3.16)
project(arkware-linux-shell C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE RelWithDebInfo)
endif()

find_package(PkgConfig REQUIRED)

# webkit2gtk-4.1 is the current package name on recent distros;
# 4.0 is the name older distros still ship. Try both rather than
# hardcoding one and breaking the other -- ROADMAP.md's v2 goal is
# "no dependency on system Chrome being installed", which implies
# working against whichever WebKitGTK the system actually has.
pkg_check_modules(GTK3 REQUIRED gtk+-3.0)
pkg_check_modules(WEBKIT2GTK webkit2gtk-4.1)
if(NOT WEBKIT2GTK_FOUND)
  pkg_check_modules(WEBKIT2GTK REQUIRED webkit2gtk-4.0)
endif()

add_executable(arkware
  src/main.c
  src/webview_impl.cc
  src/shell/shell.c
  src/shell/scripts.c
  src/webview_bridge/bridge.c
  src/config/config.c
  src/media/media.c
  src/logging/logging.c
)

target_include_directories(arkware PRIVATE
  vendor
  ${GTK3_INCLUDE_DIRS}
  ${WEBKIT2GTK_INCLUDE_DIRS}
)

target_compile_options(arkware PRIVATE
  ${GTK3_CFLAGS_OTHER}
  ${WEBKIT2GTK_CFLAGS_OTHER}
  -Wall -Wextra
)

target_link_directories(arkware PRIVATE
  ${GTK3_LIBRARY_DIRS}
  ${WEBKIT2GTK_LIBRARY_DIRS}
)

target_link_libraries(arkware PRIVATE
  ${GTK3_LIBRARIES}
  ${WEBKIT2GTK_LIBRARIES}
)

install(TARGETS arkware RUNTIME DESTINATION bin)
