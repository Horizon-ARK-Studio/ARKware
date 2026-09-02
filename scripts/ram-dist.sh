#!/usr/bin/env bash
#
# ram-dist.sh -- ephemeral distribution shell for ARKware.
#
# Fetches the `main` branch of ARKware straight into a RAM-backed
# location (/dev/shm, already tmpfs on Linux -- no root/mount needed),
# installs it there, and flushes the whole thing on exit. Nothing
# touches persistent disk. Nothing is left behind, on success or
# failure.
#
# Usage:
#   ./ram-dist.sh [git-ref]        # default ref: main
#
# Env overrides:
#   ARKWARE_REPO_URL   git URL to clone (default: upstream github)
#   ARKWARE_RAM_ROOT    RAM-backed base dir (default: /dev/shm, falls
#                        back to a tmpfs mount under /tmp if /dev/shm
#                        isn't available)
#   ARKWARE_INSTALL_CMD command to run inside the checkout after fetch
#                        (default: "npm install")
#   ARKWARE_KEEP=1       skip the flush step (debugging only)

set -euo pipefail

REF="${1:-main}"
REPO_URL="${ARKWARE_REPO_URL:-https://github.com/Horizon-ARK-Studio/ARKware.git}"
RAM_ROOT="${ARKWARE_RAM_ROOT:-/dev/shm}"
INSTALL_CMD="${ARKWARE_INSTALL_CMD:-npm install}"

WORKDIR=""
MOUNTED_TMPFS=0

log() { printf 'ram-dist: %s\n' "$*" >&2; }

ensure_ram_root() {
  if [ -d "$RAM_ROOT" ] && [ -w "$RAM_ROOT" ]; then
    return
  fi
  log "'$RAM_ROOT' unavailable, mounting a private tmpfs instead"
  RAM_ROOT="$(mktemp -d /tmp/arkware-ram.XXXXXX)"
  if command -v mount >/dev/null 2>&1 && mount -t tmpfs -o size=512m tmpfs "$RAM_ROOT" 2>/dev/null; then
    MOUNTED_TMPFS=1
  else
    log "no tmpfs mount permission either -- proceeding on '$RAM_ROOT' as-is (not guaranteed RAM-backed)"
  fi
}

flush() {
  [ "${ARKWARE_KEEP:-0}" = "1" ] && { log "ARKWARE_KEEP=1 set, leaving $WORKDIR"; return; }
  [ -n "$WORKDIR" ] || return
  log "flushing $WORKDIR"
  rm -rf -- "$WORKDIR"
  if [ "$MOUNTED_TMPFS" = "1" ]; then
    umount "$RAM_ROOT" 2>/dev/null || true
    rmdir "$RAM_ROOT" 2>/dev/null || true
  fi
}
trap flush EXIT INT TERM

fetch_via_git() {
  command -v git >/dev/null 2>&1 || return 1
  log "fetching $REPO_URL@$REF via git into RAM"
  git clone --depth 1 --branch "$REF" "$REPO_URL" "$WORKDIR" >&2
}

fetch_via_wget_tarball() {
  command -v wget >/dev/null 2>&1 || return 1
  local tarball_url="${REPO_URL%.git}/archive/refs/heads/${REF}.tar.gz"
  log "git unavailable/failed, falling back to wget tarball: $tarball_url"
  local tmp_tar
  tmp_tar="$(mktemp "$RAM_ROOT/arkware-src.XXXXXX.tar.gz")"
  wget -qO "$tmp_tar" "$tarball_url" || { rm -f "$tmp_tar"; return 1; }
  mkdir -p "$WORKDIR"
  tar -xzf "$tmp_tar" -C "$WORKDIR" --strip-components=1
  rm -f "$tmp_tar"
}

main() {
  ensure_ram_root
  WORKDIR="$(mktemp -d "$RAM_ROOT/arkware.XXXXXX")"

  fetch_via_git || fetch_via_wget_tarball || {
    log "could not retrieve $REPO_URL@$REF via git or wget"
    exit 1
  }

  log "installing in $WORKDIR ($INSTALL_CMD)"
  ( cd "$WORKDIR" && eval "$INSTALL_CMD" ) >&2

  log "install complete (RAM-only, not persisted): $WORKDIR"
  # Hand off: run whatever the caller wants against $WORKDIR before we
  # return and the EXIT trap flushes it. Callers wanting to run the
  # app itself should pass a follow-up command, e.g.:
  #   ARKWARE_INSTALL_CMD='npm install && npm run build' ./ram-dist.sh
  if [ -n "${ARKWARE_RUN_CMD:-}" ]; then
    log "running: $ARKWARE_RUN_CMD"
    ( cd "$WORKDIR" && eval "$ARKWARE_RUN_CMD" ) >&2
  fi
}

main "$@"
