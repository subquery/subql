#!/bin/bash

replace_paths() {
    file="${1}"
    sed -i "s/@subql\/common-ethereum/@subql\/common-flare/g" ${file}
    sed -i "s/@subql\/types-ethereum/@subql\/types-flare/g" ${file}
    sed -i "s/@subql\/node-ethereum/@subql\/node-flare/g" ${file}
}

for file in $(find ./packages -name '*.ts' -or -name 'package.json');
do
    if [ -f "${file}" ]; then
        replace_paths $file
    fi
done
