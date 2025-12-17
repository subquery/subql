# @subql/cli

CLI for SubQuery

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![License](https://img.shields.io/npm/l/@subql/cli.svg)](https://github.com/subquery/subql/blob/main/packages/cli/LICENSE)

<!-- toc -->

- [@subql/cli](#subqlcli)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @subql/cli
$ subql COMMAND
running command...
$ subql (--version)
@subql/cli/6.6.3-0 linux-x64 node-v24.11.1
$ subql --help [COMMAND]
USAGE
  $ subql COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`subql build [LOCATION]`](#subql-build-location)
- [`subql build-manifest [LOCATION]`](#subql-build-manifest-location)
- [`subql codegen [LOCATION]`](#subql-codegen-location)
- [`subql codegen:import-abi LOCATION`](#subql-codegenimport-abi-location)
- [`subql import-abi LOCATION`](#subql-import-abi-location)
- [`subql init NAME`](#subql-init-name)
- [`subql mcp`](#subql-mcp)
- [`subql migrate`](#subql-migrate)
- [`subql multi-chain:add [LOCATION]`](#subql-multi-chainadd-location)
- [`subql network:add-deployment-boost`](#subql-networkadd-deployment-boost)
- [`subql network:connect-wallet`](#subql-networkconnect-wallet)
- [`subql network:create-api-key NAME`](#subql-networkcreate-api-key-name)
- [`subql network:create-deployment`](#subql-networkcreate-deployment)
- [`subql network:create-flex-plan`](#subql-networkcreate-flex-plan)
- [`subql network:create-project`](#subql-networkcreate-project)
- [`subql network:disconnect-wallet`](#subql-networkdisconnect-wallet)
- [`subql network:list-account-boosts`](#subql-networklist-account-boosts)
- [`subql network:list-api-keys`](#subql-networklist-api-keys)
- [`subql network:list-deployment-boosts`](#subql-networklist-deployment-boosts)
- [`subql network:list-deployment-indexers`](#subql-networklist-deployment-indexers)
- [`subql network:list-deployments`](#subql-networklist-deployments)
- [`subql network:list-flex-plans`](#subql-networklist-flex-plans)
- [`subql network:list-projects`](#subql-networklist-projects)
- [`subql network:remove-api-key NAME`](#subql-networkremove-api-key-name)
- [`subql network:remove-deployment-boost`](#subql-networkremove-deployment-boost)
- [`subql network:stop-flex-plan`](#subql-networkstop-flex-plan)
- [`subql network:swap-deployment-boost`](#subql-networkswap-deployment-boost)
- [`subql onfinality:create-deployment`](#subql-onfinalitycreate-deployment)
- [`subql onfinality:create-multichain-deployment [LOCATION]`](#subql-onfinalitycreate-multichain-deployment-location)
- [`subql onfinality:create-project`](#subql-onfinalitycreate-project)
- [`subql onfinality:delete-deployment`](#subql-onfinalitydelete-deployment)
- [`subql onfinality:delete-project`](#subql-onfinalitydelete-project)
- [`subql onfinality:promote-deployment`](#subql-onfinalitypromote-deployment)
- [`subql publish [LOCATION]`](#subql-publish-location)

## `subql build [LOCATION]`

Build this SubQuery project code into a bundle

```
USAGE
  $ subql build [LOCATION] [--output <value>]

ARGUMENTS
  LOCATION  The path to the project, this can be a directory or a project manifest file.

FLAGS
  --output=<value>  [default: dist] The output location relative to the location

DESCRIPTION
  Build this SubQuery project code into a bundle
```

_See code: [src/commands/build.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/build.ts)_

## `subql build-manifest [LOCATION]`

Build TypeScript manifest file to YAML (generates project.yaml from project.ts)

```
USAGE
  $ subql build-manifest [LOCATION]

ARGUMENTS
  LOCATION  The path to the project, this can be a directory or a project manifest file.

DESCRIPTION
  Build TypeScript manifest file to YAML (generates project.yaml from project.ts)
```

_See code: [src/commands/build-manifest.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/build-manifest.ts)_

## `subql codegen [LOCATION]`

Generate entity types from the GraphQL schema and contract interfaces

```
USAGE
  $ subql codegen [LOCATION]

ARGUMENTS
  LOCATION  The project directory or path to project manifest.

DESCRIPTION
  Generate entity types from the GraphQL schema and contract interfaces
```

_See code: [src/commands/codegen/index.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/codegen/index.ts)_

## `subql codegen:import-abi LOCATION`

Import and ABI to generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to fetch the ABI and start block from the Etherscan.

```
USAGE
  $ subql codegen:import-abi LOCATION [--address <value>] [--abiName <value>] [--startBlock <value>] [--abiPath <value>]
    [--events <value>] [--functions <value>]

ARGUMENTS
  LOCATION  The path to the project, this can be a directory or a project manifest file.

FLAGS
  --abiName=<value>     The contracts name, if not provided, the contract address will be used if the ABI is fetched
                        from Etherscan
  --abiPath=<value>     The path to the ABI file
  --address=<value>     The contracts address
  --events=<value>      ABI events to generate handlers for. Use '*' for all. e.g. --events="approval, transfer"
  --functions=<value>   ABI functions to generate handlers for. Use '*' for all. e.g. --functions="approval, transfer"
  --startBlock=<value>  The start block of the handler, generally the block the contract is deployed.

DESCRIPTION
  Import and ABI to generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it
  will attempt to fetch the ABI and start block from the Etherscan.

ALIASES
  $ subql import-abi
```

_See code: [src/commands/codegen/import-abi.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/codegen/import-abi.ts)_

## `subql import-abi LOCATION`

Import and ABI to generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to fetch the ABI and start block from the Etherscan.

```
USAGE
  $ subql import-abi LOCATION [--address <value>] [--abiName <value>] [--startBlock <value>] [--abiPath <value>]
    [--events <value>] [--functions <value>]

ARGUMENTS
  LOCATION  The path to the project, this can be a directory or a project manifest file.

FLAGS
  --abiName=<value>     The contracts name, if not provided, the contract address will be used if the ABI is fetched
                        from Etherscan
  --abiPath=<value>     The path to the ABI file
  --address=<value>     The contracts address
  --events=<value>      ABI events to generate handlers for. Use '*' for all. e.g. --events="approval, transfer"
  --functions=<value>   ABI functions to generate handlers for. Use '*' for all. e.g. --functions="approval, transfer"
  --startBlock=<value>  The start block of the handler, generally the block the contract is deployed.

DESCRIPTION
  Import and ABI to generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it
  will attempt to fetch the ABI and start block from the Etherscan.

ALIASES
  $ subql import-abi
```

## `subql init NAME`

Initialize a SubQuery project from a template

```
USAGE
  $ subql init NAME [--location <value>] [--network <value>] [--networkFamily <value>] [--endpoint
    <value>] [--installDependencies] [--packageManager npm|yarn|pnpm] [--author <value>]

ARGUMENTS
  NAME  The name of the project to create

FLAGS
  --author=<value>           The project author that will be set in package.json. Defaults to the current system user
  --endpoint=<value>         The RPC endpoint that the project will use
  --installDependencies      Install the dependencies of the project
  --location=<value>         The path to the project, this can be a directory or a project manifest file.
  --network=<value>          The name of the network the project will index data for
  --networkFamily=<value>    The network family the project will index data for, e.g. EVM, Substrate
  --packageManager=<option>  [default: npm]
                             <options: npm|yarn|pnpm>

DESCRIPTION
  Initialize a SubQuery project from a template
```

_See code: [src/commands/init.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/init.ts)_

## `subql mcp`

Runs an MCP (Model Context Protocol) server over stdio

```
USAGE
  $ subql mcp

DESCRIPTION
  Runs an MCP (Model Context Protocol) server over stdio
```

_See code: [src/commands/mcp.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/mcp.ts)_

## `subql migrate`

Migrate a Subgraph project to a SubQuery project, including the manifest and schema.

```
USAGE
  $ subql migrate --input <value> --output <value> [--gitSubDirectory <value>]

FLAGS
  --gitSubDirectory=<value>  A subdirectory in the git repo if the input is a git repo
  --input=<value>            (required) A directory or git repo to a subgraph project
  --output=<value>           (required) The location of the SubQuery project

DESCRIPTION
  Migrate a Subgraph project to a SubQuery project, including the manifest and schema.
```

_See code: [src/commands/migrate.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/migrate.ts)_

## `subql multi-chain:add [LOCATION]`

Add new chain manifest to multi-chain project

```
USAGE
  $ subql multi-chain:add [LOCATION] --chainManifestFile <value>

ARGUMENTS
  LOCATION  The path to the multichain project, this can be a directory or a multichain manifest file.

FLAGS
  --chainManifestFile=<value>  (required) The path to the new chain manifest

DESCRIPTION
  Add new chain manifest to multi-chain project
```

_See code: [src/commands/multi-chain/add.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/multi-chain/add.ts)_

## `subql network:add-deployment-boost`

Increase the boost for a deployment

```
USAGE
  $ subql network:add-deployment-boost --network mainnet|testnet-mumbai|testnet|local --deploymentId <value> --amount
  <value>

FLAGS
  --amount=<value>        (required) The amount to boost the deployment with, in SQT
  --deploymentId=<value>  (required) The deployment id for the project
  --network=<option>      (required) [default: mainnet] The network to check.
                          <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Increase the boost for a deployment
```

_See code: [src/commands/network/add-deployment-boost.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/add-deployment-boost.ts)_

## `subql network:connect-wallet`

Connect a wallet via Wallet Connect for interacting with the network

```
USAGE
  $ subql network:connect-wallet

DESCRIPTION
  Connect a wallet via Wallet Connect for interacting with the network
```

_See code: [src/commands/network/connect-wallet.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/connect-wallet.ts)_

## `subql network:create-api-key NAME`

Create an API key for making queries via the SubQuery Network

```
USAGE
  $ subql network:create-api-key NAME --network mainnet|testnet-mumbai|testnet|local

ARGUMENTS
  NAME  The name of the api key, used to identify it

FLAGS
  --network=<option>  (required) [default: mainnet] The network to check.
                      <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Create an API key for making queries via the SubQuery Network
```

_See code: [src/commands/network/create-api-key.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/create-api-key.ts)_

## `subql network:create-deployment`

Create a new deployment for a SubQuery project

```
USAGE
  $ subql network:create-deployment --network mainnet|testnet-mumbai|testnet|local --projectId <value> --deploymentId <value>
    --deploymentVersion <value> [--deploymentDescription <value>]

FLAGS
  --deploymentDescription=<value>  A description of the deployment, release notes
  --deploymentId=<value>           (required) The IPFS CID of the published project
  --deploymentVersion=<value>      (required) The version of the deployment
  --network=<option>               (required) [default: mainnet] The network to check.
                                   <options: mainnet|testnet-mumbai|testnet|local>
  --projectId=<value>              (required) The project id, this should be a 0x prefixed hex number

DESCRIPTION
  Create a new deployment for a SubQuery project
```

_See code: [src/commands/network/create-deployment.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/create-deployment.ts)_

## `subql network:create-flex-plan`

Create a new Flex Plan for querying a SubQuery deployment on the SubQuery Network

```
USAGE
  $ subql network:create-flex-plan --network mainnet|testnet-mumbai|testnet|local --deploymentId <value> --amount
  <value>

FLAGS
  --amount=<value>        (required) The amount to deposit into the plan, in SQT
  --deploymentId=<value>  (required) The deploymentId to create a flex plan for
  --network=<option>      (required) [default: mainnet] The network to check.
                          <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Create a new Flex Plan for querying a SubQuery deployment on the SubQuery Network
```

_See code: [src/commands/network/create-flex-plan.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/create-flex-plan.ts)_

## `subql network:create-project`

Create a new SubQuery project on the SubQuery network

```
USAGE
  $ subql network:create-project --network mainnet|testnet-mumbai|testnet|local --deploymentId <value> --projectType
    0|1|2|3|SUBQUERY|RPC|SQ_DICT|SUBGRAPH --name <value> [--description <value>] [--image <value>] [--tags <value>...]
    [--website <value>] [--codeRepository <value>] [--deploymentVersion <value>] [--deploymentDescription <value>]

FLAGS
  --codeRepository=<value>         A URL to the project code repository
  --deploymentDescription=<value>  A description of the deployment, release notes
  --deploymentId=<value>           (required) The IPFS CID of the published project
  --deploymentVersion=<value>      [default: 1.0.0] The version of the deployment
  --description=<value>            A short description of the project
  --image=<value>                  A URL to an image for the project
  --name=<value>                   (required) The name of the project
  --network=<option>               (required) [default: mainnet] The network to check.
                                   <options: mainnet|testnet-mumbai|testnet|local>
  --projectType=<option>           (required)
                                   <options: 0|1|2|3|SUBQUERY|RPC|SQ_DICT|SUBGRAPH>
  --tags=<value>...                A list of tags for the project
  --website=<value>                A URL to the project website

DESCRIPTION
  Create a new SubQuery project on the SubQuery network
```

_See code: [src/commands/network/create-project.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/create-project.ts)_

## `subql network:disconnect-wallet`

Disconnect a wallet connected via WalletConnect

```
USAGE
  $ subql network:disconnect-wallet

DESCRIPTION
  Disconnect a wallet connected via WalletConnect
```

_See code: [src/commands/network/disconnect-wallet.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/disconnect-wallet.ts)_

## `subql network:list-account-boosts`

Get a list of the deployments an account boosts

```
USAGE
  $ subql network:list-account-boosts --network mainnet|testnet-mumbai|testnet|local [--address <value>]

FLAGS
  --address=<value>   The account address to list boosts for
  --network=<option>  (required) [default: mainnet] The network to check.
                      <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Get a list of the deployments an account boosts
```

_See code: [src/commands/network/list-account-boosts.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-account-boosts.ts)_

## `subql network:list-api-keys`

List API keys for making queries via the SubQuery Network

```
USAGE
  $ subql network:list-api-keys --network mainnet|testnet-mumbai|testnet|local

FLAGS
  --network=<option>  (required) [default: mainnet] The network to check.
                      <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  List API keys for making queries via the SubQuery Network
```

_See code: [src/commands/network/list-api-keys.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-api-keys.ts)_

## `subql network:list-deployment-boosts`

Get a list of boosts made to a project deployment

```
USAGE
  $ subql network:list-deployment-boosts --network mainnet|testnet-mumbai|testnet|local --deploymentId <value>

FLAGS
  --deploymentId=<value>  (required) The deployment id for the project
  --network=<option>      (required) [default: mainnet] The network to check.
                          <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Get a list of boosts made to a project deployment
```

_See code: [src/commands/network/list-deployment-boosts.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-deployment-boosts.ts)_

## `subql network:list-deployment-indexers`

List the indexers for a deployment on the SubQuery Network

```
USAGE
  $ subql network:list-deployment-indexers --network mainnet|testnet-mumbai|testnet|local --deploymentId <value>

FLAGS
  --deploymentId=<value>  (required) The DeploymentID of the project to list deployments for
  --network=<option>      (required) [default: mainnet] The network to check.
                          <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  List the indexers for a deployment on the SubQuery Network
```

_See code: [src/commands/network/list-deployment-indexers.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-deployment-indexers.ts)_

## `subql network:list-deployments`

List deployments for a SubQuery project

```
USAGE
  $ subql network:list-deployments --network mainnet|testnet-mumbai|testnet|local --projectId <value>

FLAGS
  --network=<option>   (required) [default: mainnet] The network to check.
                       <options: mainnet|testnet-mumbai|testnet|local>
  --projectId=<value>  (required) The ID of the project to list deployments for

DESCRIPTION
  List deployments for a SubQuery project
```

_See code: [src/commands/network/list-deployments.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-deployments.ts)_

## `subql network:list-flex-plans`

List your Flex Plans for querying projects on the SubQuery Network

```
USAGE
  $ subql network:list-flex-plans --network mainnet|testnet-mumbai|testnet|local [--address <value>]

FLAGS
  --address=<value>   The account address to list boosts for
  --network=<option>  (required) [default: mainnet] The network to check.
                      <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  List your Flex Plans for querying projects on the SubQuery Network
```

_See code: [src/commands/network/list-flex-plans.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-flex-plans.ts)_

## `subql network:list-projects`

List projects for a given account on then SubQuery network

```
USAGE
  $ subql network:list-projects --network mainnet|testnet-mumbai|testnet|local [--address <value>] [--networkRpc
  <value>]

FLAGS
  --address=<value>     The address of the account that owns the projects
  --network=<option>    (required) [default: mainnet] The network to check.
                        <options: mainnet|testnet-mumbai|testnet|local>
  --networkRpc=<value>  Override the network rpc url

DESCRIPTION
  List projects for a given account on then SubQuery network
```

_See code: [src/commands/network/list-projects.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/list-projects.ts)_

## `subql network:remove-api-key NAME`

Remove an API key used for making queries via the SubQuery Network

```
USAGE
  $ subql network:remove-api-key NAME --network mainnet|testnet-mumbai|testnet|local

ARGUMENTS
  NAME  The name of the api key, used to identify it

FLAGS
  --network=<option>  (required) [default: mainnet] The network to check.
                      <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Remove an API key used for making queries via the SubQuery Network
```

_See code: [src/commands/network/remove-api-key.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/remove-api-key.ts)_

## `subql network:remove-deployment-boost`

Decrease the boost amount for a project deployment on the SubQuery network

```
USAGE
  $ subql network:remove-deployment-boost --network mainnet|testnet-mumbai|testnet|local --deploymentId <value> --amount
  <value>

FLAGS
  --amount=<value>        (required) The amount of boost to remove from the deployment, in SQT
  --deploymentId=<value>  (required) The deployment id for the project
  --network=<option>      (required) [default: mainnet] The network to check.
                          <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Decrease the boost amount for a project deployment on the SubQuery network
```

_See code: [src/commands/network/remove-deployment-boost.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/remove-deployment-boost.ts)_

## `subql network:stop-flex-plan`

Stop a Flex Plan for a deployment on the SubQuery Network

```
USAGE
  $ subql network:stop-flex-plan --network mainnet|testnet-mumbai|testnet|local --deploymentId <value>

FLAGS
  --deploymentId=<value>  (required) The deploymentId to create a flex plan for
  --network=<option>      (required) [default: mainnet] The network to check.
                          <options: mainnet|testnet-mumbai|testnet|local>

DESCRIPTION
  Stop a Flex Plan for a deployment on the SubQuery Network
```

_See code: [src/commands/network/stop-flex-plan.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/stop-flex-plan.ts)_

## `subql network:swap-deployment-boost`

Swap the boost from one deployment to another deployment on the SubQuery Network

```
USAGE
  $ subql network:swap-deployment-boost --network mainnet|testnet-mumbai|testnet|local --fromDeploymentId <value> --toDeploymentId
    <value> --amount <value>

FLAGS
  --amount=<value>            (required) The amount to boost the deployment with, in SQT
  --fromDeploymentId=<value>  (required) The deployment id for the project that is already boosted
  --network=<option>          (required) [default: mainnet] The network to check.
                              <options: mainnet|testnet-mumbai|testnet|local>
  --toDeploymentId=<value>    (required) The deployment id for the project to move the boost to

DESCRIPTION
  Swap the boost from one deployment to another deployment on the SubQuery Network
```

_See code: [src/commands/network/swap-deployment-boost.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/network/swap-deployment-boost.ts)_

## `subql onfinality:create-deployment`

Create a project deployment on the OnFinality managed services

```
USAGE
  $ subql onfinality:create-deployment --org <value> --projectName <value> --type primary|stage --ipfsCID <value>
    [--indexerVersion <value>] [--queryVersion <value>] [--dict <value>] [--endpoint <value>] [--indexerUnsafe]
    [--indexerBatchSize <value>] [--indexerSubscription] [--disableHistorical] [--indexerUnfinalized]
    [--indexerStoreCacheThreshold <value>] [--disableIndexerStoreCacheAsync] [--indexerWorkers <value>] [--queryUnsafe]
    [--querySubscription] [--queryTimeout <value>] [--queryMaxConnection <value>] [--queryAggregate] [--queryLimit
    <value>] [--useDefaults]

FLAGS
  --dict=<value>                        A dictionary endpoint for this projects network
  --disableHistorical                   Disable historical data indexing
  --disableIndexerStoreCacheAsync       Disable async store cache
  --endpoint=<value>                    The RPC endpoint to be used by the project
  --indexerBatchSize=<value>            [default: 30] The batch size for the indexer
  --indexerStoreCacheThreshold=<value>  The number of items kept in the cache before flushing
  --indexerSubscription                 Enable subscription for the indexer
  --indexerUnfinalized                  Enable unfinalized blocks indexing
  --indexerUnsafe                       Run the indexer in unsafe mode, this will disable some checks
  --indexerVersion=<value>              Indexer image version
  --indexerWorkers=<value>              The number of workers for the indexer
  --ipfsCID=<value>                     (required) The IPFC CID of the published project
  --org=<value>                         (required) The Github organization name
  --projectName=<value>                 (required) Project name
  --queryAggregate                      Enable aggregate queries
  --queryLimit=<value>                  The maximum number of results for the query
  --queryMaxConnection=<value>          The maximum number of connections for the query
  --querySubscription                   Enable subscription queries
  --queryTimeout=<value>                The timeout for the query
  --queryUnsafe                         Run the query in unsafe mode, this will disable some checks
  --queryVersion=<value>                Query image version
  --type=<option>                       (required) [default: primary]
                                        <options: primary|stage>
  --useDefaults                         Use default values for indexerVersion, queryVersion, dictionary, endpoint

DESCRIPTION
  Create a project deployment on the OnFinality managed services
```

_See code: [src/commands/onfinality/create-deployment.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/onfinality/create-deployment.ts)_

## `subql onfinality:create-multichain-deployment [LOCATION]`

Create a multi-chain project deployment no the OnFinality managed services

```
USAGE
  $ subql onfinality:create-multichain-deployment [LOCATION] --org <value> --projectName <value> --type primary|stage [--indexerVersion
    <value>] [--queryVersion <value>] [--dict <value>] [--endpoint <value>] [--indexerUnsafe] [--indexerBatchSize
    <value>] [--indexerSubscription] [--disableHistorical] [--indexerUnfinalized] [--indexerStoreCacheThreshold <value>]
    [--disableIndexerStoreCacheAsync] [--indexerWorkers <value>] [--queryUnsafe] [--querySubscription] [--queryTimeout
    <value>] [--queryMaxConnection <value>] [--queryAggregate] [--queryLimit <value>] [--useDefaults] [--ipfs <value>]

ARGUMENTS
  LOCATION  The path to the project, this can be a directory or a project manifest file.

FLAGS
  --dict=<value>                        A dictionary endpoint for this projects network
  --disableHistorical                   Disable historical data indexing
  --disableIndexerStoreCacheAsync       Disable async store cache
  --endpoint=<value>                    The RPC endpoint to be used by the project
  --indexerBatchSize=<value>            [default: 30] The batch size for the indexer
  --indexerStoreCacheThreshold=<value>  The number of items kept in the cache before flushing
  --indexerSubscription                 Enable subscription for the indexer
  --indexerUnfinalized                  Enable unfinalized blocks indexing
  --indexerUnsafe                       Run the indexer in unsafe mode, this will disable some checks
  --indexerVersion=<value>              Indexer image version
  --indexerWorkers=<value>              The number of workers for the indexer
  --ipfs=<value>                        An additional IPFS endpoint to upload to
  --org=<value>                         (required) The Github organization name
  --projectName=<value>                 (required) Project name
  --queryAggregate                      Enable aggregate queries
  --queryLimit=<value>                  The maximum number of results for the query
  --queryMaxConnection=<value>          The maximum number of connections for the query
  --querySubscription                   Enable subscription queries
  --queryTimeout=<value>                The timeout for the query
  --queryUnsafe                         Run the query in unsafe mode, this will disable some checks
  --queryVersion=<value>                Query image version
  --type=<option>                       (required) [default: primary]
                                        <options: primary|stage>
  --useDefaults                         Use default values for indexerVersion, queryVersion, dictionary, endpoint

DESCRIPTION
  Create a multi-chain project deployment no the OnFinality managed services
```

_See code: [src/commands/onfinality/create-multichain-deployment.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/onfinality/create-multichain-deployment.ts)_

## `subql onfinality:create-project`

Create a project on the OnFinality managed services

```
USAGE
  $ subql onfinality:create-project --org <value> --projectName <value> [--logoURL <value>] [--subtitle <value>] [--description
    <value>] [--dedicatedDB <value>] [--projectType subquery|subgraph]

FLAGS
  --dedicatedDB=<value>   Dedicated DataBase
  --description=<value>   Description
  --logoURL=<value>       Logo URL
  --org=<value>           (required) Github organization name
  --projectName=<value>   (required) Project name
  --projectType=<option>  [default: subquery] Project type [subquery|subgraph]
                          <options: subquery|subgraph>
  --subtitle=<value>      Subtitle

DESCRIPTION
  Create a project on the OnFinality managed services
```

_See code: [src/commands/onfinality/create-project.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/onfinality/create-project.ts)_

## `subql onfinality:delete-deployment`

Delete a deployment from the OnFinality managed services

```
USAGE
  $ subql onfinality:delete-deployment --org <value> --projectName <value> --deploymentID <value>

FLAGS
  --deploymentID=<value>  (required) Deployment ID
  --org=<value>           (required) Github organization name
  --projectName=<value>   (required) Project name

DESCRIPTION
  Delete a deployment from the OnFinality managed services
```

_See code: [src/commands/onfinality/delete-deployment.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/onfinality/delete-deployment.ts)_

## `subql onfinality:delete-project`

Delete a project on the OnFinality managed services

```
USAGE
  $ subql onfinality:delete-project --org <value> --projectName <value>

FLAGS
  --org=<value>          (required) The Github organization name
  --projectName=<value>  (required) The project name

DESCRIPTION
  Delete a project on the OnFinality managed services
```

_See code: [src/commands/onfinality/delete-project.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/onfinality/delete-project.ts)_

## `subql onfinality:promote-deployment`

Promote a deployment on the OnFinality managed services from a Stage environment to Production

```
USAGE
  $ subql onfinality:promote-deployment --org <value> --projectName <value> --deploymentID <value>

FLAGS
  --deploymentID=<value>  (required) Deployment ID
  --org=<value>           (required) Github organization name
  --projectName=<value>   (required) Project name

DESCRIPTION
  Promote a deployment on the OnFinality managed services from a Stage environment to Production
```

_See code: [src/commands/onfinality/promote-deployment.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/onfinality/promote-deployment.ts)_

## `subql publish [LOCATION]`

Upload this SubQuery project to IPFS for distribution

```
USAGE
  $ subql publish [LOCATION] [--ipfs <value>] [--silent]

ARGUMENTS
  LOCATION  The path to the project, this can be a directory or a project manifest file.

FLAGS
  --ipfs=<value>  An additional IPFS endpoint to upload to
  --silent        Run the command without logging, only outputs the CIDs

DESCRIPTION
  Upload this SubQuery project to IPFS for distribution
```

_See code: [src/commands/publish.ts](https://github.com/subquery/subql/blob/cli/6.6.3-0/packages/cli/src/commands/publish.ts)_

<!-- commandsstop -->
