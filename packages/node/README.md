# @subql-node
## Description

Indexer service in our @subql toolkit, can load user's subquery then fetch, process and persist to db accordingly.

## Installation

```bash
$ npm i -g @subql/node
```

## Running the app

```bash
$> subql-node

Options:
      --help              Show help                                    [boolean]
      --version           Show version number                          [boolean]
  -f, --subquery          Local path of the subquery project            [string]
      --subquery-name     Name of the subquery project                  [string]
  -c, --config            Specify configuration file                    [string]
      --local             Use local mode                               [boolean]
      --batch-size        Batch size of blocks to fetch in one round    [number]
      --debug             Show debug information to console output. will
                          forcefully set log level to debug
                                                      [boolean] [default: false]
      --network-endpoint  Blockchain network endpoint to connect        [string]
      --output-fmt        Print log as json or plain text
                                           [string] [choices: "json", "colored"]
      --log-level         Specify log level to print. Ignored when --debug is
                          used
          [string] [choices: "fatal", "error", "warn", "info", "debug", "trace",
                                                                       "silent"]
      --migrate           Migrate db schema (for management tables only)
                                                      [boolean] [default: false]
      --timeout           Timeout for sandbox to execute the mapping functions 
                                                                        [number]                                                  
```

## License

Apache-2.0
