#!/bin/bash

replace_paths() {
    file="${1}"
    sed -i "s/@subql\/common-ethereum/@subql\/common-flare/g" ${file}
    sed -i "s/@subql\/types-ethereum/@subql\/types-flare/g" ${file}
}

for file in packages/**/*.ts;
do
    if [ -f "${file}" ]; then
        replace_paths $file
    fi
done

for file in packages/**/package.json;
do
    if [ -f "${file}" ]; then
        replace_paths $file
    fi
done