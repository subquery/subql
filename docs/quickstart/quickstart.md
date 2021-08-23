# Introduction
This section will guide you through creating a starter SubQuery Project that can be used as a framework for your own project, and that you can deploy either to a local environment (e.g. using Docker) or to [SubQuery Projects](https://project.subquery.network/) (our managed service).

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

2. With NPM installed, you can now run the following to install the SubQuery CLI:
```shell
# NPM
npm install -g @subql/cli
```
Please note that we DO NOT encourage the use of `yarn global` due to its poor dependency management which may lead to an errors down the line.

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
- `RPC endpoint` is optional. It's the running RPC endpoint you project points to. You can use the default endpoint provided `wss://polkadot.api.onfinality.io/public-ws` or provide your own.
- `Authors` is required. It's the name of the project's creator.
- `Description` is optional. It's a short description of your project.
- `Version` is optional. It's the project's version number. You can use the default value `1.0.0` or provide your own.
- `License` is optional. It's the software license for your project. You can use the default `Apache-2.0` or provide your own.

**NOTE:** You can press your `ENTER` or `RETURN` key to accept the default vialue (it may be empty). **`Authors` is the only mandatory field**. You may need to cancel out of the process with `Ctrl+C` once you see `PROJECT_NAME is ready` 

This will create a new folder inside your directory named after your PROJECT_NAME. This folder contains all of the necessary files needed to deploy a working SubQuery Project.

1. Change your working directory into the new folder:

```shell
cd PROJECT_NAME
```

2. Then, while in the new folder, install dependencies of your SubQuery Project:

```shell
# NPM
npm install

# Yarn
yarn install
```

**NOTE:** This may take a few seconds dependent on your internet connection.

## 3. Configure and build the SubQuery Project

1. Generate TypeScript from the GraphQL schema:

```shell
# NPM
npm run-script codegen

# Yarn
yarn codegen
```

**NOTE:** This step must be done whenever changes are made to the schema file in order to regenerate your types directory.

2. Then, build your code so that it can run on a locally hosted SubQuery Node:

```shell
# NPM
npm run-script build

# Yarn
yarn build
```

## 4. Deploy the SubQuery Project with Docker

The easiest way to run a SubQuery node locally is by using Docker which is what this guide will show. If you want to skip this and deploy your project using SubQuery Projects, our managed service, you can follow this guide: [Publish your new project to SubQuery Projects](../publish/publish.md)

1. Ensure Docker is installed:

```shell
docker -v
```

**NOTE:** If missing, you can follow this link to install it: [Docker](https://docs.docker.com/get-docker/)

2. Then, in your projects directory, start up a Docker container:

```shell
docker-compose pull && docker-compose up
```

**NOTE:** It may take some time to download the required packages when starting the Docker container for the first time, but shortly you will see blocks being fetched:

```shell
# Example Snippet
subquery-node_1   | 2021-08-13T13:56:16.898Z <fetch> INFO fetch block [301,361], total 61 blocks
subquery-node_1   | 2021-08-13T13:56:17.426Z <fetch> INFO fetch block [362,381], total 20 blocks
subquery-node_1   | 2021-08-13T13:56:17.951Z <fetch> INFO fetch block [382,398], total 17 blocks
```

## 5. Query the SubQuery Project using Localhost

1. Navigate to [http://localhost:3000](http://localhost:3000) in your browser to access a GraphQL playground where you can test and see the results of querys made to your project.

2. Then you can try the following query to pull the 10 most recent block heights fetched by your SubQuery Node: 

```graphql
{
  query {
    starterEntities(first: 10, orderBy: FIELD1_DESC) {
      nodes {
        field1
      }
    }
  }
}
```   

# Next steps

This is a very brief run down of how to get started. For a more detailed breakdown with a video guide check out [Hello World (localhost + Docker)](https://doc.subquery.network/quickstart/helloworld-localhost.html). 

If you are interested in how you can host your project with SubQuery Projects, checkout [HelloWorld (SubQuery hosted)](https://doc.subquery.network/quickstart/helloworld-hosted.html)