#!/bin/bash

# Get input parameters passed from the GitHub Action workflow
# Testing time
input_duration=$1
input_deployment=$2
input_endpoint=$3
input_batch_size=$4
input_workers=$5
input_disableHistorical=$6
input_others=$7

# Start the Node.js app in the background and save its PID
subql-node-ethereum -f ipfs://$input_deployment --network-endpoint=$input_endpoint --batch-size=$input_batch_size --workers=$input_workers --disable-historical=$input_disableHistorical $input_others --ipfs='https://unauthipfs.subquery.network/ipfs/api/v0' --db-schema=app > output/benchmark/indexing.log 2>&1 &

APP_PID=$!

echo "Benchmarking, please wait $input_duration."
# Wait for timeout
sleep $input_duration

# Terminate the Node.js app
pkill -P $APP_PID || true
