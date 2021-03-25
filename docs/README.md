# Welcome to SubQuery!

**SubQuery enables better dApps by making decentralised data more accessible**

SubQuery allows every Substrate/Polkadot team to process and query their data. The project is inspired by the growth of data protocols serving the application layer and its aim is to help Polkadot/Substrate projects build better dApps by allowing anyone to reliably find and consume data faster. Today, anyone can query and extract Polkadot network data in only minutes and at no cost.

**In this Guide**
1. We're going to show you how to create your first SubQuery project from scratch using real world examples.
2. We'll cover how to run your own SubQuery local node that you can use to debug, test, and run you own GraphQL server
3. Lastly, we'll explain how to upload SubQuery projects to the hosted SubQuery console so you don't need to worry about running infrastructure.

#### Step 1: Create a SubQuery project

1. use `@subql/cli` tool we provide to create a SubQuery project
    * it is written in typescript
    * user needs to config the project, define a schema and implement mapping functions
2. use `@subql/cli` to generate types from the given schema
3. use `@subql/cli` to compile and pack the SubQuery project

#### Step 2: Run an indexer and Query Service
We'll cover how to run your own SubQuery local node that you can use to debug, test, and run you own GraphQL server

You're going to need to a Postgres database, a node to extract chain data, and a moderately powerful computer to run the indexer in the background.

You'll also use our custom-built GraphQL query service `@subql/query` to interact with your SubQuery project.

#### Step 3: Publish project to the SubQuery Console
Don't want to worry about running your own SubQuery nodes? SubQuery provides a managed hosted service to the community for free.

We'll show you how to create a new Console account and publish your SubQuery project to the community on our online Explorer.

## Terminology
- SubQuery Project (*where the magic happens*): A definition (`@subql/cli`) of how a SubQuery Node should traverse and aggregate a projects network and how the data should the transformed and stored to enable useful GraphQL queries 
- SubQuery Node (*where the work is done*): A package (`@subql/node`) that will accept a SubQuery project definiton, and run a node that constantly indexes a connected network to a database
- SubQuery Query Service (*where we get the data from*): A package (`@subql/query`) that interacts with the GraphQL API of a deployed SubQuery node to query and view the indexed data
- GraphQL (*how we query the data*): A query langage for APIs that is specifically suited for flexible graph based data - see [graphql.org](https://graphql.org/learn/)

#### Legacy TODO Remove

Prerequisites
* A Postgres database
* Non-archive full node. If storage query is used, then an archive node is required to extract chain data. [OnFinality](https://onfinality.io/api_service) provides an archive node with a generous free tier that should be more than able to cover most cases. 
* A moderately powerful computer to run an indexer in the background
Then start our `@subql/node` with the path of local SubQuery project as arguments, `@subql/node` will handle the rest.

#### Step #3: Run a Query Service
A custom-built graphql query service `@subql/query` is designed to interact with the GraphQL API of deployed SubQuery project, querying and viewing the schema.

#### Components
Npmjs Packages to published:
* `@subql/cli`
* `@subql/node`
* `@subql/query`
