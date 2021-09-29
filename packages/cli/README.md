# @subql/cli

cli for polkagraph

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![License](https://img.shields.io/npm/l/@subql/cli.svg)](https://github.com/packages/cli/blob/master/package.json)

<!-- toc -->
* [@subql/cli](#subqlcli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @subql/cli
$ subql COMMAND
running command...
$ subql (-v|--version|version)
@subql/cli/0.13.1-0 darwin-x64 node-v14.15.1
$ subql --help [COMMAND]
USAGE
  $ subql COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`subql build`](#subql-build)
* [`subql codegen`](#subql-codegen)
* [`subql help [COMMAND]`](#subql-help-command)
* [`subql init [PROJECTNAME]`](#subql-init-projectname)
* [`subql publish`](#subql-publish)
* [`subql validate`](#subql-validate)

## `subql build`

Build this SubQuery project code

```
USAGE
  $ subql build

OPTIONS
  -l, --location=location                   local folder
  --mode=(production|prod|development|dev)  [default: production]
```

_See code: [lib/commands/build.js](https://github.com/packages/cli/blob/v0.13.1-0/lib/commands/build.js)_

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

_See code: [lib/commands/codegen.js](https://github.com/packages/cli/blob/v0.13.1-0/lib/commands/codegen.js)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `subql init [PROJECTNAME]`

Init a scaffold subquery project

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
  --specVersion=specVersion  [default: 0.0.1] The spec version to be used by the project
  --starter
```

_See code: [lib/commands/init.js](https://github.com/packages/cli/blob/v0.13.1-0/lib/commands/init.js)_

## `subql publish`

Upload this SubQuery project to IPFS

```
USAGE
  $ subql publish

OPTIONS
  -l, --location=location  local folder
  --ipfs=ipfs              [default: http://localhost:5001/api/v0] IPFS gateway endpoint
```

## `subql validate`

check a folder or github repo is a validate subquery project

```
USAGE
  $ subql validate

OPTIONS
  -l, --location=location  local folder, github repo url or IPFS cid

  --ipfs=ipfs              [default: http://localhost:5001/api/v0] IPFS gateway endpoint, used for validating projects
                           on IPFS

  --silent
```

_See code: [lib/commands/validate.js](https://github.com/packages/cli/blob/v0.13.1-0/lib/commands/validate.js)_
<!-- commandsstop -->
