# Welcome to SubQuery - Extended to index Terra!

This fork extends the node package of official subql implementation to index Terra. 

Note: Find the starter project for indexing terra here : https://github.com/DeveloperInProgress/subqlstarter-terra

## Quick Start

Warning: This project has only been tested on Linux

Demo video: https://youtu.be/K_pjh5OC95A

### setup

Follow this demo video for setup

1. Clone this repository

`git clone https://github.com/DeveloperInProgress/subql.git`

2. Install dependencies for subql

```
cd subql
yarn install
```

3. Build subql/node package

```
cd packages/node
yarn build
```

4. Run the node module. On the first run, codegen function will be called on subql Terra project. But it will ask for the missing build folder later because the subql Terra project must have not been built yet. Build the Subql Terra project as given here[https://github.com/DeveloperInProgress/subqlstarter-terra/blob/main/README.md#setup] and run this command again

WARNING: The following must be executed twice. Read the instruction above.

`sudo node bin/run -f <path_to_project> --chain terra --force-clean --debug --port 3001`

Note: You may choose any port except the default value, 3000. Because @subql/query will use this port later on.


5. Run @subql/query module

`subql-query --name <project_name> --playground`

Now you may query the indexed data from http://localhost:3000

## Project Manifest

### Network Configuration

The network configuration for subql terra projects has been modified to include "chainId" parameter. 

Example:

```
network:
  genesisHash: 'q4PIUU/W6KSxGM9wyowkSW+Ij8HuODDeM4USpA2ucWc='
  endpoint: https://bombay-lcd.terra.dev
  chainId: bombay-12
```

The chainId parameter is required to create a Terra LCDClient

### Datasources

Terra supports two kinds of datasources: terra/Runtime and terra/Custom. They are equivalent to substarte/Runtime and substrate/Custom in polkadot counterpart respectively

There are two types of datasource mapping handlers:

1. terra/BlockHandler : handler for Terra Blocks
2. terra/EventHandler : handler for Terra Events

## Future Works

The following will be implemented in the modified node module:

1. Event Filters
2. Proof of Index
3. Dictionary Service
