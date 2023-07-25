#!/bin/bash

input_duration=$1

# Function to convert time string to seconds
t2s() {
   sed 's/d/*24*3600 +/g; s/h/*3600 +/g; s/m/*60 +/g; s/s/\+/g; s/+[ ]*$//g' <<< "$1" | bc
}

# Query the database and store the result in variables
runner_node=$(psql -h postgres -d postgres -U postgres -c "SELECT value FROM app._metadata WHERE key = 'runnerNode';" | awk 'NR == 3 {print $1}' | tr -d '"')
indexer_version=$(psql -h postgres -d postgres -U postgres -c "SELECT value FROM app._metadata WHERE key = 'indexerNodeVersion';" | awk 'NR == 3 {print $1}' | tr -d '"')
start_height=$(psql -h postgres -d postgres -U postgres -c "SELECT value::integer FROM app._metadata WHERE key = 'startHeight';" | awk 'NR == 3 {print $1}')
last_processed_height=$(psql -h postgres -d postgres -U postgres -c "SELECT value::integer FROM app._metadata WHERE key = 'lastProcessedHeight';" | awk 'NR == 3 {print $1}')
total_height=$((last_processed_height-start_height+1))
time_in_seconds=$(t2s "$input_duration")
bps=$(awk "BEGIN {printf \"%.2f\", $total_height / $time_in_seconds}")
# Set outputs for subsequent steps
echo "::set-output name=runner_node::$runner_node"
echo "::set-output name=indexer_version::$indexer_version"
echo "::set-output name=start_height::$start_height"
echo "::set-output name=last_processed_height::$last_processed_height"
echo "::set-output name=total_height::$total_height"
echo "::set-output name=bps::$bps"
