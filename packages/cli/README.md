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
@subql/cli/6.1.3-0 linux-x64 node-v22.17.1
$ subql --help [COMMAND]
USAGE
  $ subql COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`subql build [LOCATION]`](#subql-build-location)
- [`subql codegen [LOCATION]`](#subql-codegen-location)
- [`subql codegen:import-abi LOCATION`](#subql-codegenimport-abi-location)
- [`subql import-abi LOCATION`](#subql-import-abi-location)
- [`subql init NAME`](#subql-init-name)
- [`subql mcp`](#subql-mcp)
- [`subql migrate`](#subql-migrate)
- [`subql multi-chain:add [LOCATION]`](#subql-multi-chainadd-location)
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

_See code: [src/commands/build.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/build.ts)_

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

_See code: [src/commands/codegen/index.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/codegen/index.ts)_

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

_See code: [src/commands/codegen/import-abi.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/codegen/import-abi.ts)_

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

_See code: [src/commands/init.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/init.ts)_

## `subql mcp`

Runs an MCP (Model Context Protocol) server over stdio

```
USAGE
  $ subql mcp

DESCRIPTION
  Runs an MCP (Model Context Protocol) server over stdio
```

_See code: [src/commands/mcp.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/mcp.ts)_

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

_See code: [src/commands/migrate.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/migrate.ts)_

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

_See code: [src/commands/multi-chain/add.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/multi-chain/add.ts)_

## `subql onfinality:create-deployment`

Create a project deployment on the OnFinality managed services

```
USAGE
  $ subql onfinality:create-deployment --org <value> --projectName <value> --ipfsCID <value> [--type primary|stage]
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
  --type=<option>                       [default: primary]
                                        <options: primary|stage>
  --useDefaults                         Use default values for indexerVersion, queryVersion, dictionary, endpoint

DESCRIPTION
  Create a project deployment on the OnFinality managed services
```

_See code: [src/commands/onfinality/create-deployment.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/onfinality/create-deployment.ts)_

## `subql onfinality:create-multichain-deployment [LOCATION]`

Create a multi-chain project deployment no the OnFinality managed services

```
USAGE
  $ subql onfinality:create-multichain-deployment [LOCATION] --org <value> --projectName <value> [--type primary|stage] [--indexerVersion
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
  --type=<option>                       [default: primary]
                                        <options: primary|stage>
  --useDefaults                         Use default values for indexerVersion, queryVersion, dictionary, endpoint

DESCRIPTION
  Create a multi-chain project deployment no the OnFinality managed services
```

_See code: [src/commands/onfinality/create-multichain-deployment.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/onfinality/create-multichain-deployment.ts)_

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

_See code: [src/commands/onfinality/create-project.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/onfinality/create-project.ts)_

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

_See code: [src/commands/onfinality/delete-deployment.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/onfinality/delete-deployment.ts)_

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

_See code: [src/commands/onfinality/delete-project.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/onfinality/delete-project.ts)_

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

_See code: [src/commands/onfinality/promote-deployment.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/onfinality/promote-deployment.ts)_

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

_See code: [src/commands/publish.ts](https://github.com/subquery/subql/blob/cli/6.1.3-0/packages/cli/src/commands/publish.ts)_

<!-- commandsstop -->
