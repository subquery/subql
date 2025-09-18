#!/bin/sh
set -e

apk add --no-cache jq
npm install -g --force yarn@latest
cd "$1"

# Modifies the package.json to replace "workspace:~" versions with actual versions
while read -r dep; do
  directory=$(jq --arg dep "$dep" -r '.compilerOptions.paths[$dep][0]' ../../tsconfig.json | cut -d'/' -f 2)
  if [ -z "$directory" ]; then
    continue
  fi
  version=$(jq -r --arg directory "$directory" '.version' "../$directory/package.json")
  if [ -n "$version" ] && [ "$version" != "null" ]; then
    jq --arg dep "$dep" --arg version "$version" '.dependencies[$dep] = $version' package.json > package.tmp.json
    mv package.tmp.json package.json
  fi
done << <(jq -r '.dependencies | to_entries[] | select(.value == "workspace:~") | .key' package.json)

yarn pack --filename app.tgz
rm -rf /root/.npm /root/.cache
