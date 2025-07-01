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
@subql/cli/5.13.1-0 linux-x64 node-v22.17.0
$ subql --help [COMMAND]
USAGE
  $ subql COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`subql build`](#subql-build)
- [`subql codegen`](#subql-codegen)
- [`subql codegen:generate`](#subql-codegengenerate)
- [`subql deployment`](#subql-deployment)
- [`subql deployment:delete`](#subql-deploymentdelete)
- [`subql deployment:deploy`](#subql-deploymentdeploy)
- [`subql deployment:promote`](#subql-deploymentpromote)
- [`subql import-abi`](#subql-import-abi)
- [`subql init [PROJECTNAME]`](#subql-init-projectname)
- [`subql migrate`](#subql-migrate)
- [`subql multi-chain:add`](#subql-multi-chainadd)
- [`subql multi-chain:deploy`](#subql-multi-chaindeploy)
- [`subql project`](#subql-project)
- [`subql project:create-project`](#subql-projectcreate-project)
- [`subql project:delete-project`](#subql-projectdelete-project)
- [`subql publish`](#subql-publish)

## `subql build`

Build this SubQuery project code

```
USAGE
  $ subql build [-f <value>] [-o <value>] [--mode production|prod|development|dev] [-s]

FLAGS
  -f, --location=<value>  local folder or manifest file to run build
  -o, --output=<value>    output folder of build e.g. dist
  -s, --silent            silent mode
  --mode=<option>         [default: production]
                          <options: production|prod|development|dev>

DESCRIPTION
  Build this SubQuery project code
```

_See code: [lib/commands/build/index.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/build/index.ts)_

## `subql codegen`

Generate entity types from the GraphQL schema

```
USAGE
  $ subql codegen [-l <value>] [-f <value>]

FLAGS
  -f, --file=<value>      specify manifest file path (will overwrite -l if both used)
  -l, --location=<value>  local folder to run codegen in. please use file flag instead

DESCRIPTION
  Generate entity types from the GraphQL schema
```

_See code: [lib/commands/codegen/index.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/codegen/index.ts)_

## `subql codegen:generate`

Generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to fetch the ABI and start block from the Etherscan.

```
USAGE
  $ subql codegen:generate [-f <value>] [--address <value>] [--startBlock <value>] [--abiPath <value>] [--events
    <value>] [--functions <value>]

FLAGS
  -f, --file=<value>    Project folder or manifest file
  --abiPath=<value>     The path to the ABI file
  --address=<value>     The contracts address
  --events=<value>      ABI events to generate handlers for, --events="approval, transfer"
  --functions=<value>   ABI functions to generate handlers for,  --functions="approval, transfer"
  --startBlock=<value>  The start block of the handler, generally the block the contract is deployed.

DESCRIPTION
  Generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to
  fetch the ABI and start block from the Etherscan.

ALIASES
  $ subql import-abi
```

_See code: [lib/commands/codegen/generate.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/codegen/generate.ts)_

## `subql deployment`

Deploy to OnFinality managed services

```
USAGE
  $ subql deployment --endpoint <value> [--options deploy|promote|delete] [--org <value>] [--projectName
    <value>] [--type stage|primary] [--indexerVersion <value>] [--queryVersion <value>] [--dict <value>]
    [--indexerUnsafe] [--indexerBatchSize <value>] [--indexerSubscription] [--disableHistorical] [--indexerUnfinalized]
    [--indexerStoreCacheThreshold <value>] [--disableIndexerStoreCacheAsync] [--indexerWorkers <value>] [--queryUnsafe]
    [--querySubscription] [--queryTimeout <value>] [--queryMaxConnection <value>] [--queryAggregate] [--queryLimit
    <value>] [-d] [--ipfsCID <value>] [--project_name <value>] [--deploymentID <value>]

FLAGS
  -d, --useDefaults                     Use default values for indexerVersion, queryVersion, dictionary, endpoint
  --deploymentID=<value>                Enter deployment ID
  --dict=<value>                        Enter dictionary
  --disableHistorical                   Disable Historical Data
  --disableIndexerStoreCacheAsync       If enabled the store cache will flush data asynchronously relative to indexing
                                        data.
  --endpoint=<value>                    (required) Enter endpoint
  --indexerBatchSize=<value>            Enter batchSize from 1 to 30
  --indexerStoreCacheThreshold=<value>  The number of items kept in the cache before flushing
  --indexerSubscription                 Enable Indexer subscription
  --indexerUnfinalized                  Index unfinalized blocks (requires Historical to be enabled)
  --indexerUnsafe                       Enable indexer unsafe
  --indexerVersion=<value>              Enter indexer-version
  --indexerWorkers=<value>              Enter worker threads from 1 to 5
  --ipfsCID=<value>                     Enter IPFS CID
  --options=<option>                    <options: deploy|promote|delete>
  --org=<value>                         Enter organization name
  --projectName=<value>                 Enter project name
  --project_name=<value>                Enter project name
  --queryAggregate                      Enable Aggregate
  --queryLimit=<value>                  Set the max number of results the query service returns
  --queryMaxConnection=<value>          Enter MaxConnection from 1 to 10
  --querySubscription                   Enable Query subscription
  --queryTimeout=<value>                Enter timeout from 1000ms to 60000ms
  --queryUnsafe                         Enable indexer unsafe
  --queryVersion=<value>                Enter query-version
  --type=<option>                       [default: primary]
                                        <options: stage|primary>

DESCRIPTION
  Deploy to OnFinality managed services
```

_See code: [lib/commands/deployment/index.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/deployment/index.ts)_

## `subql deployment:delete`

Delete a deployment from the OnFinality managed services

```
USAGE
  $ subql deployment:delete [--org <value>] [--project_name <value>] [--deploymentID <value>]

FLAGS
  --deploymentID=<value>  Enter deployment ID
  --org=<value>           Enter organization name
  --project_name=<value>  Enter project name

DESCRIPTION
  Delete a deployment from the OnFinality managed services
```

_See code: [lib/commands/deployment/delete.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/deployment/delete.ts)_

## `subql deployment:deploy`

Deploy a project to the OnFinality managed services

```
USAGE
  $ subql deployment:deploy --endpoint <value> [--org <value>] [--projectName <value>] [--type stage|primary]
    [--indexerVersion <value>] [--queryVersion <value>] [--dict <value>] [--indexerUnsafe] [--indexerBatchSize <value>]
    [--indexerSubscription] [--disableHistorical] [--indexerUnfinalized] [--indexerStoreCacheThreshold <value>]
    [--disableIndexerStoreCacheAsync] [--indexerWorkers <value>] [--queryUnsafe] [--querySubscription] [--queryTimeout
    <value>] [--queryMaxConnection <value>] [--queryAggregate] [--queryLimit <value>] [-d] [--ipfsCID <value>]

FLAGS
  -d, --useDefaults                     Use default values for indexerVersion, queryVersion, dictionary, endpoint
  --dict=<value>                        Enter dictionary
  --disableHistorical                   Disable Historical Data
  --disableIndexerStoreCacheAsync       If enabled the store cache will flush data asynchronously relative to indexing
                                        data.
  --endpoint=<value>                    (required) Enter endpoint
  --indexerBatchSize=<value>            Enter batchSize from 1 to 30
  --indexerStoreCacheThreshold=<value>  The number of items kept in the cache before flushing
  --indexerSubscription                 Enable Indexer subscription
  --indexerUnfinalized                  Index unfinalized blocks (requires Historical to be enabled)
  --indexerUnsafe                       Enable indexer unsafe
  --indexerVersion=<value>              Enter indexer-version
  --indexerWorkers=<value>              Enter worker threads from 1 to 5
  --ipfsCID=<value>                     Enter IPFS CID
  --org=<value>                         Enter organization name
  --projectName=<value>                 Enter project name
  --queryAggregate                      Enable Aggregate
  --queryLimit=<value>                  Set the max number of results the query service returns
  --queryMaxConnection=<value>          Enter MaxConnection from 1 to 10
  --querySubscription                   Enable Query subscription
  --queryTimeout=<value>                Enter timeout from 1000ms to 60000ms
  --queryUnsafe                         Enable indexer unsafe
  --queryVersion=<value>                Enter query-version
  --type=<option>                       [default: primary]
                                        <options: stage|primary>

DESCRIPTION
  Deploy a project to the OnFinality managed services
```

_See code: [lib/commands/deployment/deploy.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/deployment/deploy.ts)_

## `subql deployment:promote`

Promote a deployment on the OnFinality managed services from a Stage environment to Production

```
USAGE
  $ subql deployment:promote [--org <value>] [--project_name <value>] [--deploymentID <value>]

FLAGS
  --deploymentID=<value>  Enter deployment ID
  --org=<value>           Enter organization name
  --project_name=<value>  Enter project name

DESCRIPTION
  Promote a deployment on the OnFinality managed services from a Stage environment to Production
```

_See code: [lib/commands/deployment/promote.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/deployment/promote.ts)_

## `subql import-abi`

Generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to fetch the ABI and start block from the Etherscan.

```
USAGE
  $ subql import-abi [-f <value>] [--address <value>] [--startBlock <value>] [--abiPath <value>] [--events
    <value>] [--functions <value>]

FLAGS
  -f, --file=<value>    Project folder or manifest file
  --abiPath=<value>     The path to the ABI file
  --address=<value>     The contracts address
  --events=<value>      ABI events to generate handlers for, --events="approval, transfer"
  --functions=<value>   ABI functions to generate handlers for,  --functions="approval, transfer"
  --startBlock=<value>  The start block of the handler, generally the block the contract is deployed.

DESCRIPTION
  Generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to
  fetch the ABI and start block from the Etherscan.

ALIASES
  $ subql import-abi
```

## `subql init [PROJECTNAME]`

Initialize a SubQuery project from a template

```
USAGE
  $ subql init [PROJECTNAME] [-f] [-l <value>] [--install-dependencies] [--npm] [--abiPath <value>]
    [--network <value>] [--description <value>] [--author <value>] [--endpoint <value>]

ARGUMENTS
  PROJECTNAME  Give the starter project name

FLAGS
  -f, --force             Force using all the default options, except the name and network
  -l, --location=<value>  local folder to create the project in
  --abiPath=<value>       A path to an ABI file that will be used to scaffold the project
  --author=<value>        The author of the project, defaults to your computer username
  --description=<value>   The description for your project
  --endpoint=<value>      The RPC endpoint for your project
  --install-dependencies  Install dependencies as well
  --network=<value>       The name of the network to initialise a project with
  --npm                   Force using NPM instead of yarn, only works with `install-dependencies` flag

DESCRIPTION
  Initialize a SubQuery project from a template
```

_See code: [lib/commands/init.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/init.ts)_

## `subql migrate`

Migrate a Subgraph project to a SubQuery project, including the manifest and schema.

```
USAGE
  $ subql migrate [-d <value>] [-f <value>] [-o <value>]

FLAGS
  -d, --gitSubDirectory=<value>  Specify git subdirectory path
  -f, --file=<value>             Specify subgraph git/directory path
  -o, --output=<value>           Output subquery project path

DESCRIPTION
  Migrate a Subgraph project to a SubQuery project, including the manifest and schema.
```

_See code: [lib/commands/migrate.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/migrate.ts)_

## `subql multi-chain:add`

Add new chain manifest to multi-chain configuration

```
USAGE
  $ subql multi-chain:add [-f <value>] [-c <value>]

FLAGS
  -c, --chainManifestPath=<value>  path to the new chain manifest
  -f, --multichain=<value>         [default: /home/runner/work/subql/subql/packages/cli] specify multichain manifest
                                   file path

DESCRIPTION
  Add new chain manifest to multi-chain configuration
```

_See code: [lib/commands/multi-chain/add.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/multi-chain/add.ts)_

## `subql multi-chain:deploy`

Multi-chain deployment to hosted service

```
USAGE
  $ subql multi-chain:deploy -f <value> [--org <value>] [--projectName <value>] [--type stage|primary] [--indexerVersion
    <value>] [--queryVersion <value>] [--dict <value>] [--endpoint <value>] [--indexerUnsafe] [--indexerBatchSize
    <value>] [--indexerSubscription] [--disableHistorical] [--indexerUnfinalized] [--indexerStoreCacheThreshold <value>]
    [--disableIndexerStoreCacheAsync] [--indexerWorkers <value>] [--queryUnsafe] [--querySubscription] [--queryTimeout
    <value>] [--queryMaxConnection <value>] [--queryAggregate] [--queryLimit <value>] [-d] [--ipfs <value>]

FLAGS
  -d, --useDefaults                     Use default values for indexerVersion, queryVersion, dictionary, endpoint
  -f, --location=<value>                (required) from project folder or specify manifest file
  --dict=<value>                        Enter dictionary
  --disableHistorical                   Disable Historical Data
  --disableIndexerStoreCacheAsync       If enabled the store cache will flush data asynchronously relative to indexing
                                        data.
  --endpoint=<value>                    Enter endpoint
  --indexerBatchSize=<value>            Enter batchSize from 1 to 30
  --indexerStoreCacheThreshold=<value>  The number of items kept in the cache before flushing
  --indexerSubscription                 Enable Indexer subscription
  --indexerUnfinalized                  Index unfinalized blocks (requires Historical to be enabled)
  --indexerUnsafe                       Enable indexer unsafe
  --indexerVersion=<value>              Enter indexer-version
  --indexerWorkers=<value>              Enter worker threads from 1 to 5
  --ipfs=<value>                        IPFS gateway endpoint
  --org=<value>                         Enter organization name
  --projectName=<value>                 Enter project name
  --queryAggregate                      Enable Aggregate
  --queryLimit=<value>                  Set the max number of results the query service returns
  --queryMaxConnection=<value>          Enter MaxConnection from 1 to 10
  --querySubscription                   Enable Query subscription
  --queryTimeout=<value>                Enter timeout from 1000ms to 60000ms
  --queryUnsafe                         Enable indexer unsafe
  --queryVersion=<value>                Enter query-version
  --type=<option>                       [default: primary]
                                        <options: stage|primary>

DESCRIPTION
  Multi-chain deployment to hosted service
```

_See code: [lib/commands/multi-chain/deploy.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/multi-chain/deploy.ts)_

## `subql project`

Create/Delete projects on the OnFinality managed services

```
USAGE
  $ subql project [--options create|delete] [--org <value>] [--projectName <value>] [--logoURL <value>]
    [--subtitle <value>] [--description <value>] [--dedicatedDB <value>] [--projectType <value>]

FLAGS
  --dedicatedDB=<value>  Enter dedicated DataBase
  --description=<value>  Enter description
  --logoURL=<value>      Enter logo URL
  --options=<option>     <options: create|delete>
  --org=<value>          Enter organization name
  --projectName=<value>  Enter project name
  --projectType=<value>  [default: subquery] Enter project type [subquery|subgraph]
  --subtitle=<value>     Enter subtitle

DESCRIPTION
  Create/Delete projects on the OnFinality managed services
```

_See code: [lib/commands/project/index.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/project/index.ts)_

## `subql project:create-project`

Create a project on OnFinality managed services

```
USAGE
  $ subql project:create-project [--org <value>] [--projectName <value>] [--logoURL <value>] [--subtitle <value>]
    [--description <value>] [--dedicatedDB <value>] [--projectType <value>]

FLAGS
  --dedicatedDB=<value>  Enter dedicated DataBase
  --description=<value>  Enter description
  --logoURL=<value>      Enter logo URL
  --org=<value>          Enter organization name
  --projectName=<value>  Enter project name
  --projectType=<value>  [default: subquery] Enter project type [subquery|subgraph]
  --subtitle=<value>     Enter subtitle

DESCRIPTION
  Create a project on OnFinality managed services
```

_See code: [lib/commands/project/create-project.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/project/create-project.ts)_

## `subql project:delete-project`

Delete a project on OnFinality managed services

```
USAGE
  $ subql project:delete-project [--org <value>] [--projectName <value>]

FLAGS
  --org=<value>          Enter organization name
  --projectName=<value>  Enter project name

DESCRIPTION
  Delete a project on OnFinality managed services
```

_See code: [lib/commands/project/delete-project.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/project/delete-project.ts)_

## `subql publish`

Upload this SubQuery project to IPFS for distribution

```
USAGE
  $ subql publish [-f <value>] [--ipfs <value>] [-o]

FLAGS
  -f, --location=<value>  from project folder or specify manifest file
  -o, --output            Output IPFS CID
  --ipfs=<value>          IPFS gateway endpoint

DESCRIPTION
  Upload this SubQuery project to IPFS for distribution
```

_See code: [lib/commands/publish.js](https://github.com/subquery/subql/blob/cli/5.13.1-0/packages/cli/src/commands/publish.ts)_

<!-- commandsstop -->
