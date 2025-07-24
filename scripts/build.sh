#!/bin/sh
set -e

apk add --no-cache jq
npm install -g --force yarn@latest

cd "$1"

# Replace "workspace:*" versions with actual versions
jq -r '.dependencies | to_entries[] | select(.value == "workspace:*") | .key' package.json | while read -r dep; do
  directory=$(jq --arg dep "$dep" -r '.compilerOptions.paths[$dep][0]' ../../tsconfig.json | cut -d'/' -f 2)
  version=$(jq --arg directory "$directory" -r '.version' ../"$directory"/package.json)
  if [ "$version" != null ]; then
    jq --arg dep "$dep" --arg version "$version" \
      -r '.dependencies[$dep] = $version' package.json \
      > package.tmp.json && mv package.tmp.json package.json
  fi
done

yarn install --production --frozen-lockfile

yarn pack --filename app.tgz

rm -rf node_modules /root/.npm /root/.cache
