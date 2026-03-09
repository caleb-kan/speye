#!/usr/bin/env bash
set -euo pipefail

npx generate-license-file --input package.json --output public/license.txt --overwrite

find src/lib/ -type f \( -name 'LICENSE' -o -name 'LICENSE.*' \) \
  -exec bash -c 'printf "\n-----------\n\n" >> public/license.txt; cat "$1" >> public/license.txt' _ {} \;
