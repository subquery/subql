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
      --help           Show help                                       [boolean]
      --version        Show version number                             [boolean]
  -f, --subquery       the local path of subquery project               [string]
      --subquery-name  name of the subquery project                     [string]
  -c, --config         specify configuration file                       [string]
      --local          use local mode                                  [boolean]
      --batch-size     batch size of blocks to fetch in one round       [number]
      --debug          show debug information to console output
                                                      [boolean] [default: false]
      --output-fmt     print log as json or plain text
                                           [string] [choices: "json", "colored"]
```

## License

Apache-2.0
