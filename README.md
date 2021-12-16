# Welcome to SubQuery - Extended to index Terra!

This fork extends the node package of official subql implementation to index Terra. 

##Quick Start

Warning: This project has only been tested on Linux

###setup

Follow this demo video for setup

1. Clone this repository

`git clone https://github.com/DeveloperInProgress/subql.git`

2. Install dependencies for subql

`yarn install`

3. Build subql/node package

```
cd packages/node
yarn build
```

4. Run the node module. On the first run, codegen function will be called on subql Terra project. But will thrown an error later because the subql Terra project must have not been built yet. Build the Subql Terra project as given here[readme link here] and run this command again

WARNING: The following must be executed twice. Read the instruction above.

`sudo node bin/run -f <path_to_project> --chain terra --force-clean --debug --port 3001`

Note: You may choose any port except the default value, 3000. Because @subql/query will use this port later on.


