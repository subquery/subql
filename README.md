# Welcome to SubQuery!
![open grant logo](https://raw.githubusercontent.com/w3f/General-Grants-Program/master/src/badge_black.svg)

**SubQuery enables better dApps by making decentralised data more accessible**

SubQuery allows every Substrate/Polkadot team to process and query their data. The project is inspired by the growth of data protocols serving the application layer and its aim is to help Polkadot/Substrate projects build better dApps by allowing anyone to reliably find and consume data faster. Today, anyone can query and extract Polkadot network data in only minutes and at no cost.

SubQuery aims to support all Substrate-compatible networks.


### Run project
The first, you need to create sample project with command: `subql init sample`

Then go to sample project directory and run `yarn install` to install all dependencies

After installation, change your project.yaml file, here is an example:

```yaml
specVersion: 0.2.0
name: sample
version: 0.0.4
description: Cuong
repository: https://github.com/subquery/subql-starter
schema:
  file: /Users/trancuong/Sotatek/SubQuery/sample/schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
dataSources:
  - kind: solana/Runtime
    startBlock: 97497290
    mapping:
      file: ./dist/index.js
      handlers:
        - handler: handleBlock
          kind: solana/BlockHandler
```

After that, you can run `yarn codegen && yarn build` to build the sample project

Then go to `subql` project, in root path of the project, run the following command:
```shell
yarn install
cd packages/types-solana && yarn build
cd ../common-solana && yarn build
cd ../node-solana && yarn build
```

## Get Started
#### Installation
```shell
# Yarn
yarn global add @subql/cli @subql/node @subql/query

# NPM
npm install -g @subql/cli @subql/node @subql/query
```

#### Create a SubQuery project
You can follow our [Quick Start Guide](https://doc.subquery.network/quickstart/quickstart.html) to learn how to create, initialize, build, and publish a new SubQuery Project using the `@subql/cli` tool.

You'll need [Typescript](https://www.typescriptlang.org/) and [Node](https://nodejs.org/en/).

#### Publish your SubQuery Project to our Managed Service
Don't want to worry about running your own SubQuery nodes? SubQuery provides a [managed hosted service](https://explorer.subquery.network) to the community for free. Follow our publishing guide to see how you can upload your project to [SubQuery Projects](https://project.subquery.network).

#### Run your own Indexer and Query Service
[Follow our guide](https://doc.subquery.network/run/run.html) to run your own SubQuery local node that you can use to debug, test, and run you own GraphQL server

You're going to need to a Postgres database, a node to extract chain data, and a moderately powerful computer to run the indexer in the background.

You'll also use our custom-built GraphQL query service [`@subql/query`](https://www.npmjs.com/package/@subql/query) to interact with your SubQuery project.

#### Components
* [`@subql/cli`](packages/cli)
* [`@subql/node`](packages/node)
* [`@subql/query`](packages/query)
* [`@subql/contract-processors`](packages/contract-processors)
* [`@subql/common`](packages/common)
* [`@subql/types`](packages/types)
* [`@subql/validator`](packages/validator)

## More Documentation
For more documentation, visit [doc.subquery.network](https://doc.subquery.network/)

## Copyright
SubQuery is a project built with love from the team at [OnFinality](https://onfinality.io)
Copyright © 2021 [OnFinality Limited](https://onfinality.io) authors & contributors
