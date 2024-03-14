# @subql/cli

CLI for SubQuery

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![License](https://img.shields.io/npm/l/@subql/cli.svg)](https://github.com/packages/cli/blob/master/package.json)

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
@subql/cli/4.4.1-0 linux-x64 node-v18.19.1
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
- [`subql init [PROJECTNAME]`](#subql-init-projectname)
- [`subql multi-chain:add`](#subql-multi-chainadd)
- [`subql multi-chain:deploy`](#subql-multi-deploy)
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

_See code: [lib/commands/build/index.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/build/index.js)_

## `subql codegen`

Generate schemas for graph node

```
USAGE
  $ subql codegen [-l <value>] [-f <value>]

FLAGS
  -f, --file=<value>      specify manifest file path (will overwrite -l if both used)
  -l, --location=<value>  [deprecated] local folder to run codegen in. please use file flag instead

DESCRIPTION
  Generate schemas for graph node
```

_See code: [lib/commands/codegen/index.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/codegen/index.js)_

## `subql codegen:generate`

Generate Project.yaml and mapping functions based on provided ABI

```
USAGE
  $ subql codegen:generate --abiPath <value> --startBlock <value> [-f <value>] [--events <value>] [--functions
    <value>] [--address <value>]

FLAGS
  -f, --file=<value>    specify manifest file path
  --abiPath=<value>     (required) path to abi from root
  --address=<value>     contract address
  --events=<value>      abi events, --events="approval, transfer"
  --functions=<value>   abi functions,  --functions="approval, transfer"
  --startBlock=<value>  (required) startBlock

DESCRIPTION
  Generate Project.yaml and mapping functions based on provided ABI
```

_See code: [lib/commands/codegen/generate.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/codegen/generate.js)_

## `subql deployment`

Deploy to hosted service

```
USAGE
  $ subql deployment --endpoint <value> [--options deploy|promote|delete] [--org <value>] [--projectName
    <value>] [--ipfsCID <value>] [--type stage|primary] [--indexerVersion <value>] [--queryVersion <value>] [--dict
    <value>] [--indexerUnsafe] [--indexerBatchSize <value>] [--indexerSubscription] [--disableHistorical]
    [--indexerUnfinalized] [--indexerStoreCacheThreshold <value>] [--disableIndexerStoreCacheAsync] [--indexerWorkers
    <value>] [--queryUnsafe] [--querySubscription] [--queryTimeout <value>] [--queryMaxConnection <value>]
    [--queryAggregate] [-d] [--project_name <value>] [--deploymentID <value>]

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
  --queryMaxConnection=<value>          Enter MaxConnection from 1 to 10
  --querySubscription                   Enable Query subscription
  --queryTimeout=<value>                Enter timeout from 1000ms to 60000ms
  --queryUnsafe                         Enable indexer unsafe
  --queryVersion=<value>                Enter query-version
  --type=<option>                       [default: primary]
                                        <options: stage|primary>

DESCRIPTION
  Deploy to hosted service
```

_See code: [lib/commands/deployment/index.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/deployment/index.js)_

## `subql deployment:delete`

Delete Deployment

```
USAGE
  $ subql deployment:delete [--org <value>] [--project_name <value>] [--deploymentID <value>]

FLAGS
  --deploymentID=<value>  Enter deployment ID
  --org=<value>           Enter organization name
  --project_name=<value>  Enter project name

DESCRIPTION
  Delete Deployment
```

_See code: [lib/commands/deployment/delete.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/deployment/delete.js)_

## `subql deployment:deploy`

Deployment to hosted service

```
USAGE
  $ subql deployment:deploy --endpoint <value> [--org <value>] [--projectName <value>] [--ipfsCID <value>] [--type
    stage|primary] [--indexerVersion <value>] [--queryVersion <value>] [--dict <value>] [--indexerUnsafe]
    [--indexerBatchSize <value>] [--indexerSubscription] [--disableHistorical] [--indexerUnfinalized]
    [--indexerStoreCacheThreshold <value>] [--disableIndexerStoreCacheAsync] [--indexerWorkers <value>] [--queryUnsafe]
    [--querySubscription] [--queryTimeout <value>] [--queryMaxConnection <value>] [--queryAggregate] [-d]

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
  --queryMaxConnection=<value>          Enter MaxConnection from 1 to 10
  --querySubscription                   Enable Query subscription
  --queryTimeout=<value>                Enter timeout from 1000ms to 60000ms
  --queryUnsafe                         Enable indexer unsafe
  --queryVersion=<value>                Enter query-version
  --type=<option>                       [default: primary]
                                        <options: stage|primary>

DESCRIPTION
  Deployment to hosted service
```

_See code: [lib/commands/deployment/deploy.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/deployment/deploy.js)_

## `subql deployment:promote`

Promote Deployment

```
USAGE
  $ subql deployment:promote [--org <value>] [--project_name <value>] [--deploymentID <value>]

FLAGS
  --deploymentID=<value>  Enter deployment ID
  --org=<value>           Enter organization name
  --project_name=<value>  Enter project name

DESCRIPTION
  Promote Deployment
```

_See code: [lib/commands/deployment/promote.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/deployment/promote.js)_

## `subql init [PROJECTNAME]`

Initialize a scaffold subquery project

```
USAGE
  $ subql init [PROJECTNAME] [-f] [-l <value>] [--install-dependencies] [--npm] [--abiPath <value>]

ARGUMENTS
  PROJECTNAME  Give the starter project name

FLAGS
  -f, --force
  -l, --location=<value>  local folder to create the project in
  --abiPath=<value>       path to abi file
  --install-dependencies  Install dependencies as well
  --npm                   Force using NPM instead of yarn, only works with `install-dependencies` flag

DESCRIPTION
  Initialize a scaffold subquery project
```

_See code: [lib/commands/init.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/init.js)_

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

_See code: [lib/commands/multi-chain/add.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/multi-chain/add.js)_

## `subql multi-chain:deploy`

Deploy multi-chain configuration to hosted service

```
USAGE
  $ subql multi-chain:deploy -f <value> --endpoint <value> [--options deploy|promote|delete] [--org <value>] [--projectName
    <value>] [--type stage|primary] [--indexerVersion <value>] [--queryVersion <value>] [--dict
    <value>] [--indexerUnsafe] [--indexerBatchSize <value>] [--indexerSubscription] [--disableHistorical]
    [--indexerWorkers <value>] [--queryUnsafe] [--querySubscription] [--queryTimeout <value>] [--queryMaxConnection
    <value>] [--queryAggregate] [-d] [--project_name <value>] [--deploymentID <value>]

FLAGS
  -f <value>                    (required) Specify multichain manifest file
  -d, --useDefaults             Use default values for indexerVersion, queryVersion, dictionary, endpoint
  --deploymentID=<value>        Enter deployment ID
  --dict=<value>                Enter dictionary with syntax (chainId1,http://url_dict_1,chainId2,http://url_dict_2)
  --disableHistorical           Disable Historical Data
  --endpoint=<value>            Enter endpoint with syntax ((chainId1,http://url_rpc_1,chainId2,http://url_rpc_1)
  --indexerBatchSize=<value>    Enter batchSize from 1 to 30
  --indexerSubscription         Enable Indexer subscription
  --indexerUnsafe               Enable indexer unsafe
  --indexerVersion=<value>      Enter indexer-version with syntax: (chainId1:1.3.5,chainId2:1.3.5)
  --indexerWorkers=<value>      Enter worker threads from 1 to 30
  --options=<option>            <options: deploy|promote|delete>
  --org=<value>                 Enter organization name
  --projectName=<value>         Enter project name
  --project_name=<value>        Enter project name
  --queryAggregate              Enable Aggregate
  --queryMaxConnection=<value>  Enter MaxConnection from 1 to 10
  --querySubscription           Enable Query subscription
  --queryTimeout=<value>        Enter timeout from 1000ms to 60000ms
  --queryUnsafe                 Enable indexer unsafe
  --queryVersion=<value>        Enter query-version
  --type=<option>               [default: primary]
                                <options: stage|primary>                                   file path
EXAMPLE
subql multi-chain:deploy -f ./Subquery/subql-starter/Multi-chain/transfers/subquery-multichain.yaml --endpoint=0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe:http://1.1.1.1,0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:http://2.2.2.2 --indexerVersion=0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe:3.9.0,0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3:3.9.0

Minimal required field ( -f ) Multichain manifest. 
DESCRIPTION
  Deploy multi-chain configuration to hosted service
```

_See code: [lib/commands/multi-chain/deploy.js](https://github.com/packages/cli/blob/v4.2.6-1/lib/commands/multi-chain/deploy.js)_

## `subql project`

Create/Delete project

```
USAGE
  $ subql project [--options create|delete] [--org <value>] [--projectName <value>] [--gitRepo <value>]
    [--logoURL <value>] [--subtitle <value>] [--description <value>] [--apiVersion <value>] [--dedicatedDB <value>]

FLAGS
  --apiVersion=<value>   [default: 2] Enter api version
  --dedicatedDB=<value>  Enter dedicated DataBase
  --description=<value>  Enter description
  --gitRepo=<value>      Enter git repository
  --logoURL=<value>      Enter logo URL
  --options=<option>     <options: create|delete>
  --org=<value>          Enter organization name
  --projectName=<value>  Enter project name
  --subtitle=<value>     Enter subtitle

DESCRIPTION
  Create/Delete project
```

_See code: [lib/commands/project/index.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/project/index.js)_

## `subql project:create-project`

Create Project on Hosted Service

```
USAGE
  $ subql project:create-project [--org <value>] [--projectName <value>] [--gitRepo <value>] [--logoURL <value>] [--subtitle
    <value>] [--description <value>] [--apiVersion <value>] [--dedicatedDB <value>]

FLAGS
  --apiVersion=<value>   [default: 2] Enter api version
  --dedicatedDB=<value>  Enter dedicated DataBase
  --description=<value>  Enter description
  --gitRepo=<value>      Enter git repository
  --logoURL=<value>      Enter logo URL
  --org=<value>          Enter organization name
  --projectName=<value>  Enter project name
  --subtitle=<value>     Enter subtitle

DESCRIPTION
  Create Project on Hosted Service
```

_See code: [lib/commands/project/create-project.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/project/create-project.js)_

## `subql project:delete-project`

Delete Project on Hosted Service

```
USAGE
  $ subql project:delete-project [--org <value>] [--projectName <value>]

FLAGS
  --org=<value>          Enter organization name
  --projectName=<value>  Enter project name

DESCRIPTION
  Delete Project on Hosted Service
```

_See code: [lib/commands/project/delete-project.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/project/delete-project.js)_

## `subql publish`

Upload this SubQuery project to IPFS

```
USAGE
  $ subql publish [-f <value>] [--ipfs <value>] [-o]

FLAGS
  -f, --location=<value>  from project folder or specify manifest file
  -o, --output            Output IPFS CID
  --ipfs=<value>          IPFS gateway endpoint

DESCRIPTION
  Upload this SubQuery project to IPFS
```

_See code: [lib/commands/publish.js](https://github.com/packages/cli/blob/v4.4.1-0/lib/commands/publish.js)_

<!-- commandsstop -->
