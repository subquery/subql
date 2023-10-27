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

# Path to the node package.json
node_package_json="./packages/node/package.json"

# Iterate over each package
for package in ${!packages[@]}
do
  # Get the version of the current package
  version=$(jq -r '.version' $package/package.json)
  echo $package
  echo $version

  # Check if the node package.json file exists
  if [[ -f $node_package_json ]]; then
    # Replace workspace:* with the actual version in package.json of node
    sed -i.bak "s#\"${packages[$package]}\": \"workspace:\*\"#\"${packages[$package]}\": \"$version\"#g" $node_package_json
    # Remove the backup file
    rm "${node_package_json}.bak"
  else
    echo "Error: $node_package_json does not exist."
    exit 1
  fi
done