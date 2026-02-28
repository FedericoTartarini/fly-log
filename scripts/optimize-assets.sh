#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ASSETS_DIR="${ROOT_DIR}/src/assets"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick 'magick' is required but not found in PATH." >&2
  exit 1
fi

if [ ! -d "${ASSETS_DIR}" ]; then
  echo "Assets directory not found: ${ASSETS_DIR}" >&2
  exit 1
fi

QUALITY=82
SIZES=(380 760 1200 1800)

create_variants() {
  local input="$1"
  local stem="$2"

  for size in "${SIZES[@]}"; do
    magick "${input}" -resize "${size}x" -strip -quality "${QUALITY}" "${ASSETS_DIR}/${stem}-${size}.webp"
  done
}

create_variants "${ASSETS_DIR}/showcase.png" "showcase"

find "${ASSETS_DIR}" -maxdepth 1 -type f \( \
  -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \
\) ! -name "*-*.webp" ! -name "showcase.png" | while IFS= read -r img; do
  filename="$(basename "${img}")"
  stem="${filename%.*}"
  create_variants "${img}" "${stem}"
done

echo "Asset variants generated in ${ASSETS_DIR}"
