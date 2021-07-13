# Welcome to SubQuery!
![open grant logo](https://raw.githubusercontent.com/w3f/General-Grants-Program/master/src/badge_black.svg)

**SubQuery enables better dApps by making decentralised data more accessible**

SubQuery allows every Substrate/Polkadot team to process and query their data. The project is inspired by the growth of data protocols serving the application layer and its aim is to help Polkadot/Substrate projects build better dApps by allowing anyone to reliably find and consume data faster. Today, anyone can query and extract Polkadot network data in only minutes and at no cost.

**In this Guide**
1. We're going to show you how to create your first SubQuery project from scratch using real world examples.
2. We'll cover how to run your own SubQuery local node that you can use to debug, test, and run you own GraphQL server
3. Lastly, we'll explain how to upload SubQuery projects to the hosted SubQuery console so you don't need to worry about running infrastructure.

## Create a SubQuery project
You can follow our [Quick Start Guide](../quickstart/quickstart.md) to learn how to create, initialize, build, and pack a new SubQuery Project using the [`@subql/cli`](https://www.npmjs.com/package/@subql/cli) tool.

You'll need [Typescript](https://www.typescriptlang.org/) and  [Node](https://nodejs.org/en/).

## Start using your project
#### Publish Project to the SubQuery Explorer
Don't want to worry about running your own SubQuery nodes? SubQuery provides a [managed hosted service](https://explorer.subquery.network) to the community for free. [Follow our publishing guide](../publish/publish.md) to see how you can upload your project to [SubQuery Projects](https://project.subquery.network).

#### Run your own Local Indexer and Query Service
We'll cover how to run your own SubQuery local node that you can use to debug, test, and run you own GraphQL server

You're going to need to a Postgres database, a node to extract chain data, and a moderately powerful computer to run the indexer in the background.

You'll also use our custom-built GraphQL query service [`@subql/query`](https://www.npmjs.com/package/@subql/query) to interact with your SubQuery project.

## Terminology
- SubQuery Project (*where the magic happens*): A definition ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) of how a SubQuery Node should traverse and aggregate a projects network and how the data should the transformed and stored to enable useful GraphQL queries 
- SubQuery Node (*where the work is done*): A package ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) that will accept a SubQuery project definiton, and run a node that constantly indexes a connected network to a database
- SubQuery Query Service (*where we get the data from*): A package ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) that interacts with the GraphQL API of a deployed SubQuery node to query and view the indexed data
- GraphQL (*how we query the data*): A query langage for APIs that is specifically suited for flexible graph based data - see [graphql.org](https://graphql.org/learn/)
