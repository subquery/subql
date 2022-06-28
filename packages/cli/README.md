# @subql/cli

cli for polkagraph

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
$ subql (-v|--version|version)
@subql/cli/1.1.1-1 linux-x64 node-v16.15.1
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
- [`subql deployment`](#subql-deployment)
- [`subql deployment:delete`](#subql-deploymentdelete)
- [`subql deployment:deploy`](#subql-deploymentdeploy)
- [`subql deployment:promote`](#subql-deploymentpromote)
- [`subql help [COMMAND]`](#subql-help-command)
- [`subql init [PROJECTNAME]`](#subql-init-projectname)
- [`subql migrate`](#subql-migrate)
- [`subql project`](#subql-project)
- [`subql project:create-project`](#subql-projectcreate-project)
- [`subql project:delete-project`](#subql-projectdelete-project)
- [`subql publish`](#subql-publish)
- [`subql validate`](#subql-validate)

## `subql build`

Build this SubQuery project code

```
USAGE
  $ subql build

OPTIONS
  -f, --location=location                   local folder
  -o, --output=output                       output folder of build e.g. dist
  --mode=(production|prod|development|dev)  [default: production]
```

_See code: [lib/commands/build.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/build.js)_

## `subql codegen`

Generate schemas for graph node

```
USAGE
  $ subql codegen

OPTIONS
  -f, --force
  -l, --location=location  local folder to run codegen in
  --file=file
```

_See code: [lib/commands/codegen.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/codegen.js)_

## `subql deployment`

Deployment to hosted service

```
USAGE
  $ subql deployment

OPTIONS
  --deploymentID=deploymentID      Enter deployment ID
  --dict=dict                      enter dict
  --endpoint=endpoint              enter endpoint
  --indexerVersion=indexerVersion  enter indexer-version
  --ipfsCID=ipfsCID                Enter IPFS CID
  --options=deploy|promote|delete
  --org=org                        Enter organization name
  --project_name=project_name      Enter project name
  --queryVersion=queryVersion      enter query-version
  --type=type                      [default: primary] enter type
```

_See code: [lib/commands/deployment/index.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/deployment/index.js)_

## `subql deployment:delete`

Delete Deployment

```
USAGE
  $ subql deployment:delete

OPTIONS
  --deploymentID=deploymentID  Enter deployment ID
  --org=org                    Enter organization name
  --project_name=project_name  Enter project name
```

_See code: [lib/commands/deployment/delete.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/deployment/delete.js)_

## `subql deployment:deploy`

Deployment to hosted service

```
USAGE
  $ subql deployment:deploy

OPTIONS
  --dict=dict                      enter dict
  --endpoint=endpoint              enter endpoint
  --indexerVersion=indexerVersion  enter indexer-version
  --ipfsCID=ipfsCID                Enter IPFS CID
  --org=org                        Enter organization name
  --project_name=project_name      Enter project name
  --queryVersion=queryVersion      enter query-version
  --type=type                      [default: primary] enter type
```

_See code: [lib/commands/deployment/deploy.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/deployment/deploy.js)_

## `subql deployment:promote`

Promote Deployment

```
USAGE
  $ subql deployment:promote

OPTIONS
  --deploymentID=deploymentID  Enter deployment ID
  --org=org                    Enter organization name
  --project_name=project_name  Enter project name
```

_See code: [lib/commands/deployment/promote.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/deployment/promote.js)_

## `subql help [COMMAND]`

display help for subql

```
USAGE
  $ subql help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.3.1/src/commands/help.ts)_

## `subql init [PROJECTNAME]`

Initialize a scaffold subquery project

```
USAGE
  $ subql init [PROJECTNAME]

ARGUMENTS
  PROJECTNAME  Give the starter project name

OPTIONS
  -f, --force
  -l, --location=location    local folder to create the project in
  --install-dependencies     Install dependencies as well
  --npm                      Force using NPM instead of yarn, only works with `install-dependencies` flag
  --specVersion=0.2.0|1.0.0  [default: 1.0.0] The spec version to be used by the project
```

_See code: [lib/commands/init.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/init.js)_

## `subql migrate`

Migrate Subquery project manifest to v1.0.0

```
USAGE
  $ subql migrate

OPTIONS
  -f, --force
  -l, --location=location  local folder to run migrate in
  --file=file
```

_See code: [lib/commands/migrate.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/migrate.js)_

## `subql project`

Create/Delete project

```
USAGE
  $ subql project

OPTIONS
  --apiVersion=apiVersion      [default: 2] Enter api version
  --description=description    Enter description
  --gitRepo=gitRepo            Enter git repository
  --logoURL=logoURL            Enter logo URL
  --options=create|delete
  --org=org                    Enter organization name
  --project_name=project_name  Enter project name
  --subtitle=subtitle          Enter subtitle
```

_See code: [lib/commands/project/index.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/project/index.js)_

## `subql project:create-project`

Create Project on Hosted Service

```
USAGE
  $ subql project:create-project

OPTIONS
  --apiVersion=apiVersion      [default: 2] Enter api version
  --description=description    Enter description
  --gitRepo=gitRepo            Enter git repository
  --logoURL=logoURL            Enter logo URL
  --org=org                    Enter organization name
  --project_name=project_name  Enter project name
  --subtitle=subtitle          Enter subtitle
```

_See code: [lib/commands/project/create-project.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/project/create-project.js)_

## `subql project:delete-project`

Delete Project on Hosted Service

```
USAGE
  $ subql project:delete-project

OPTIONS
  --org=org                    Enter organization name
  --project_name=project_name  Enter project name
```

_See code: [lib/commands/project/delete-project.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/project/delete-project.js)_

## `subql publish`

Upload this SubQuery project to IPFS

```
USAGE
  $ subql publish

OPTIONS
  -f, --location=location  from project or manifest path
  --ipfs=ipfs              IPFS gateway endpoint
```

_See code: [lib/commands/publish.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/publish.js)_

## `subql validate`

Check a folder or github repo is a validate subquery project

```
USAGE
  $ subql validate

OPTIONS
  -l, --location=location                              local folder, github repo url or IPFS cid

  --ipfs=ipfs                                          [default: https://ipfs.subquery.network/ipfs/api/v0] IPFS gateway
                                                       endpoint, used for validating projects on IPFS

  --network-family=(Substrate|Avalanche|Terra|Cosmos)

  --silent
```

_See code: [lib/commands/validate.js](https://github.com/packages/cli/blob/v1.1.1-1/lib/commands/validate.js)_

<!-- commandsstop -->
