This page with guide you through creating a starter SubQuery Project that can be used as a framework for your own project, and that you can deploy either to a local environment (e.g. using Docker) or to [SubQuery Projects](https://project.subquery.network/) (our managed service).

At the end of this guide, you'll have a working SubQuery project running on a SubQuery node with a GraphQL endpoint that you can query data from.

# Local Development

This guide uses Docker for local development and deployment. It covers the following steps:

1. Set up the SubQuery CLI and its dependencies
2. Initialise a starter SubQuery Project
3. Configure and build the SubQuery Project
4. Deploy the SubQuery Project with Docker
5. Query the SubQuery Project using Localhost

## 1. Set up the SubQuery CLI and its dependencies

1. Ensure Yarn **and/or** NPM (package manager) is installed:
   
```shell
# NPM
npm -v

# Yarn
yarn -v
``` 
**NOTE:** If missing, you can follow these links to install them: [Yarn](https://classic.yarnpkg.com/en/docs/install/) or [NPM](https://www.npmjs.com/get-npm).

2. With Yarn or NPM installed, you can now run the following to install the SubQuery CLI:
```shell
# NPM
npm install -g @subql/cli

# Yarn
yarn global add @subql/cli
```
You can then run the following command to see what is available for use with the SubQuery CLI:

```shell
subql help
```

## 2. Initialise a starter SubQuery Project

1. Make sure you are inside the directory in which you want to create a SubQuery project, and run the following command while replacing `PROJECT_NAME` with the name of your project:

```shell
subql init --starter PROJECT_NAME
```

- `Git repository` is optional. It's the Git URL to your project's repo.
- `RPC endpoint` is required. It's the running RPC endpoint you project points to. You can use the default endpoint provided `wss://polkadot.api.onfinality.io/public-ws` or provide your own.
- `Authors` is required. It's the name of the project's creator.
- `Description` is optional. It's a short description of your project.
- `Version` is required. It's the project's version number. You can use the default value `1.0.0` or provide your own.
- `License` is required. It's the software license for your project. You can use the default `Apache-2.0` or provide your own.

**NOTE:** You can press your `ENTER` or `RETURN` key to accept the default vialue (it may be empty). **`Authors` is the only mandatory field**. You may need to cancel out of the process with `Ctrl+C` once you see `PROJECT_NAME is ready` 

This will create a new folder inside your directory named after your PROJECT_NAME. This folder contains all of the necessary files needed to deploy a working SubQuery Project.

2. Change your working directory into the new folder:

```shell
cd PROJECT_NAME
```

3. While in the new folder, install dependencies of your SubQuery Project:

```shell
# NPM
npm install

# Yarn
yarn install
```

**NOTE:** This may take a few seconds dependent on your internet connection.




## 3. Configure and build the SubQuery Project

In the starter package that you just initialised, we have provided a standard configuration for your new project. You will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write your own SubQuery, check out our documentation under [Create a Project](../create/introduction.md)

### GraphQL Model Generation

In order to [index](../run/run.md) your SubQuery project, you must first generate the required GraphQL models that you have defined in your GraphQL Schema file (`schema.graphql`). Run this command in the root of the project directory.

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

You should see a GraphQL playground is showing in the explorer and the schemas that are ready to query. On the top right of the playground, you'll find a _Docs_ button that will open a documentation draw. This documentation is automatically generated and helps you find what entities and methods you can query.

For a new SubQuery starter project, you can try the following query to get a taste of how it works or [learn more about the GraphQL Query language](../query/graphql.md).

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
