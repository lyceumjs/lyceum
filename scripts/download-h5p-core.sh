#!/usr/bin/env bash
#
# Fetch the H5P core + editor static assets (NOT distributed on npm) into the
# git-ignored H5P data directory. Idempotent and fail-fast (FR-003 / Decision 8).
#
set -euo pipefail

DEST="${H5P_DATA_DIR:-./h5p-data}"
CORE_TAG="${H5P_CORE_TAG:-1.27.0}"
EDITOR_TAG="${H5P_EDITOR_TAG:-1.27.0}"

mkdir -p "$DEST/core" "$DEST/editor"

fetch() {
  local url="$1" dst="$2"
  if [ -n "$(ls -A "$dst" 2>/dev/null || true)" ]; then
    echo "[h5p] $dst already populated — skipping"
    return 0
  fi
  echo "[h5p] downloading $url"
  local tmp
  tmp="$(mktemp)"
  curl -fsSL "$url" -o "$tmp"
  tar -xzf "$tmp" -C "$dst" --strip-components=1
  rm -f "$tmp"
}

fetch "https://github.com/h5p/h5p-php-library/archive/refs/tags/${CORE_TAG}.tar.gz" "$DEST/core"
fetch "https://github.com/h5p/h5p-editor-php-library/archive/refs/tags/${EDITOR_TAG}.tar.gz" "$DEST/editor"

echo "[h5p] core ($CORE_TAG) + editor ($EDITOR_TAG) assets ready in $DEST"
