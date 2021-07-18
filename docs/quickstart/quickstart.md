# Quick Start Guide

In this Quick Start guide, we're going to create a simple starter project that you can be used as a framework for developing your own SubQuery Project.

At the end of this guide, you'll have a working SubQuery project running on a SubQuery node with a GraphQL endpoint that you can query data from.

If you haven't already, we suggest that you familiarise yourself with the [terminology](../#terminology) used in SubQuery.

## Preparation

### Local Development Environment

- [Typescript](https://www.typescriptlang.org/) is required to compile project and define types.
- Both SubQuery CLI and generated Project have dependencies and require a modern version [Node](https://nodejs.org/en/).
- SubQuery Nodes require Docker

### Install the SubQuery CLI

Install SubQuery CLI globally on your terminal by using NPM:

```shell
# NPM
npm install -g @subql/cli
```

We **DO NOT** suggest `yarn global` due to its poor dependency management might lead to an error

You can then run help to see available commands and usage provide by CLI

```shell
subql help
```

## Initialise the Starter SubQuery Project

Inside the directory in which you want to create a SubQuery project, simply replace `PROJECT_NAME` with your own and run the command:

```shell
subql init --starter PROJECT_NAME
```

You'll be asked certain questions as the SubQuery project is initalised:

- Git repository (Optional): Provide a Git URL to a repo that this SubQuery project will be hosted in (when hosted in SubQuery Explorer)
- RPC endpoint (Required): Provide a wss URL to a running RPC enpoint that will be used by default for this poject. You can quickly access public endpoints for different Polkadot networks or even create your own private dedicated node using [OnFinality](https://app.onfinality.io) or just use the default Polkadot endpoint.
- Authors (Required): Enter the owner of this SubQuery project here
- Description (Optional): You can provide a short paragraph about your project that describe what data it contains and what users can do with it
- Version (Required): Enter a custom version number or use the default (`1.0.0`)
- License (Required): Provide the software license for this project or accept the default (`Apache-2.0`)

After the initialisation process is complete, you should see a folder with your project name has been created inside the directory. The contents of this directoy should be identical to what's listed in the [Directory Structure](../create/introduction.md#directory-structure).

Last, under the project directory, run following command to install the new project's dependencies.

```shell
cd PROJECT_NAME

# Yarn
yarn install

# NPM
npm install
```

## Configure and Build the Starter Project

In the starter package that you just initialised, we have provided a standard configuration for your new project. You will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write your own SubQuery, check out our documentation under [Create a Project](../create/introduction.md)

### GraphQL Model Generation

In order to [index](https://doc.subquery.network/run/run.html) your SubQuery project, you must first generate the required GraphQL models that you have defined in your GraphQL Schema file (`schema.graphql`). Run this command in the root of the project directory.

```shell
# Yarn
yarn codegen

# NPM
npm run-script codegen
```

You'll find the generated models in the `/src/types/models` directory

## Build the Project

In order run your SubQuery Project on a locally hosted SubQuery Node, you need to build your work.

Run the build command from the project's root directory.

```shell
# Yarn
yarn build

# NPM
npm run-script build
```

## Running and Querying your Starter Project

Although you can quickly publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network), the easiest way to run SubQuery nodes locally is in a Docker container, if you don't already have Docker you can install it from [docker.com](https://docs.docker.com/get-docker/).

[_Skip this and publish your new project to SubQuery Projects_](../publish/publish.md)

### Run your SubQuery Project

All configuration that controls how a SubQuery node is run is defined in this `docker-compose.yml` file. For a new project that has been just initalised you won't need to change anything here, but you can read more about the file and the settings in our [Run a Project section](../run/run.md)

Under the project directory run following command:

```shell
docker-compose pull && docker-compose up
```

It may take some time to download the required packages ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query), and Postgres) for the first time but soon you'll see a running SubQuery node.

### Query your Project

Open your browser and head to [http://localhost:3000](http://localhost:3000).

You should see a GraphQL playground is showing in the explorer and the schemas that ready to query. On the top right of the playground, you'll find a _Docs_ button that will open a documentation draw. This documentation is automatically generated and helps you find what entities and methods you can query.

For a new SubQuery starter project, you can try the following query to get a taste of how it works or [learn more about the GraphQL Query language.](../query/graphql.md).

```graphql
{
  query {
    starterEntities(first: 10) {
      nodes {
        field1
        field2
        field3
      }
    }
  }
}
```

## Next Steps

Congratulations, you now have a locally running SubQuery project that accepts GraphQL API requests for sample data. In the next guide, we'll show you how to publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network)

[Publish your new project to SubQuery Projects](../publish/publish.md)
