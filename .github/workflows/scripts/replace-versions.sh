#!/bin/bash

# Mapping of paths to package names
declare -A packages
packages["./packages/common"]="@subql/common"
packages["./packages/common-substrate"]="@subql/common-substrate"
packages["./packages/node-core"]="@subql/node-core"
packages["./packages/types-core"]="@subql/types-core"
packages["./packages/types"]="@subql/types"
packages["./packages/utils"]="@subql/utils"
packages["./packages/testing"]="@subql/testing"

# Iterate over each package
for package in ${!packages[@]}
do
  # Get the version of the current package
  version=$(jq -r '.version' $package/package.json)

  # Replace workspace:* with the actual version in package.json of node
  sed -i "s#\"${packages[$package]}\": \"workspace:*\"#\"${packages[$package]}\": \"$version\"#g" ./packages/node/package.json
done