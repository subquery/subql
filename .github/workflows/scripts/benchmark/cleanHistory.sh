#!/bin/bash

output_dir=$1

if [ -d "$output_dir" ]; then
  echo "Removing existing directory: $output_dir"
  rm -rf "$output_dir"
fi
# Create the new directory
echo "Creating new directory: ${PWD}/$output_dir"
mkdir -p "$output_dir"
