#!/bin/bash

replace_paths() {
    file="${1}"
    sed -i "s/subql-node-ethereum/subql-node-flare/g" ${file}
    sed -i "s/@subql\/node-ethereum/@subql\/node-flare/g" ${file}
}


file=packages/node/Dockerfile

if [ -f "${file}" ]; then
    replace_paths $file
fi
