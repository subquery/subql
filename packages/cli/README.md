@subql/cli
===============

cli for polkagraph

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@subql/cli.svg)](https://npmjs.org/package/@subql/cli)
[![License](https://img.shields.io/npm/l/@subql/cli.svg)](https://github.com/packages/cli/blob/master/package.json)

<!-- toc -->
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
@subql/cli/0.0.1 darwin-x64 node-v12.16.3
$ subql --help [COMMAND]
USAGE
  $ subql COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`subql hello [FILE]`](#subql-hello-file)
* [`subql help [COMMAND]`](#subql-help-command)

## `subql hello [FILE]`

describe the command here

```
USAGE
  $ subql hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ cli hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/packages/cli/blob/v0.0.1/src/commands/hello.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_
<!-- commandsstop -->
