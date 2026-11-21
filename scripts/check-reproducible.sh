#!/usr/bin/env bash
# AMO release gate: the extension zip and the sources zip must be byte-identical
# across two clean builds of HEAD, and a build from the sources zip must
# reproduce the extension zip. Exits non-zero on any mismatch.
set -euo pipefail

repo="$(git rev-parse --show-toplevel)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

build() {
  local dir="$1"
  (cd "$dir" && npm ci --no-audit --no-fund >/dev/null && npx wxt zip -b firefox >/dev/null)
}

hash_of() {
  sha256sum "$1"/.output/*-"$2".zip | cut -d' ' -f1
}

for run in 1 2; do
  git clone --quiet "$repo" "$work/run$run"
  git -C "$work/run$run" checkout --quiet "$(git -C "$repo" rev-parse HEAD)"
  build "$work/run$run"
done

ext1="$(hash_of "$work/run1" firefox)"
ext2="$(hash_of "$work/run2" firefox)"
src1="$(hash_of "$work/run1" sources)"
src2="$(hash_of "$work/run2" sources)"

# What an AMO reviewer does: unpack the submitted sources and build them.
mkdir "$work/from-sources"
unzip -q "$work"/run1/.output/*-sources.zip -d "$work/from-sources"
build "$work/from-sources"
ext3="$(hash_of "$work/from-sources" firefox)"

printf 'extension  run1 %s\n           run2 %s\n           from sources %s\n' "$ext1" "$ext2" "$ext3"
printf 'sources    run1 %s\n           run2 %s\n' "$src1" "$src2"

if [[ "$ext1" == "$ext2" && "$ext1" == "$ext3" && "$src1" == "$src2" ]]; then
  echo "reproducible"
else
  echo "NOT reproducible" >&2
  exit 1
fi
