#!/bin/bash

set -e

replace_paths() {
    file="${1}"
    sed -i "s/@subql\/common-ethereum/@subql\/common-flare/g" ${file}
    sed -i "s/@subql\/types-ethereum/@subql\/types-flare/g" ${file}
    sed -i "s/@subql\/node-ethereum/@subql\/node-flare/g" ${file}
    sed -i "s/subql-node-ethereum/subql-node-flare/g" ${file}
}

for file in $(find ./packages -name '*.ts' -or -name 'package.json');
do
    if [ -f "${file}" ]; then
        replace_paths $file
    else
        echo "WARNING: ${file} not found"
    fi
done

# Replace paths in tsconfig.json
if [ -f "./tsconfig.json" ]; then
    replace_paths './tsconfig.json'
else
    echo "WARNING: tsconfig.json not found"
fi
