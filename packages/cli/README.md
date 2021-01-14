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
@subql/cli/0.4.1-0 linux-x64 node-v12.20.0
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
* [`subql init PROJECTNAME`](#subql-init-projectname)

## `subql build`

Pack this SubQuery project

```
USAGE
  $ subql build

OPTIONS
  -f, --force
  --file=file
```

_See code: [lib/commands/build.js](https://github.com/packages/cli/blob/v0.4.1-0/lib/commands/build.js)_

## `subql codegen`

Generate schemas for graph node

```
USAGE
  $ subql codegen

OPTIONS
  -f, --force
  --file=file
```

_See code: [lib/commands/codegen.js](https://github.com/packages/cli/blob/v0.4.1-0/lib/commands/codegen.js)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.1/src/commands/help.ts)_

## `subql init PROJECTNAME`

Init a scaffold subquery project

```
USAGE
  $ subql init PROJECTNAME

ARGUMENTS
  PROJECTNAME  Give the starter project name

OPTIONS
  -f, --force
  --starter
```

_See code: [lib/commands/init.js](https://github.com/packages/cli/blob/v0.4.1-0/lib/commands/init.js)_
<!-- commandsstop -->
