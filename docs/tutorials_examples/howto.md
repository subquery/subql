# Tutorials

## How to start at a different block height?

### Video guide

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Introduction

By default, all starter projects start synchronising the blockchain from the genesis block. In otherwords, from block 1. For large blockchains, this can typically take days or even weeks to fully synchronise. 

To start a SubQuery node synchronising from a non-zero height, all you have to do is to modify your project.yaml file and change the startBlock key.

Below is a project.yaml file where the start block has been set to 1,000,000

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

### Why not start from zero?

The main reason is that it can reduce the time to synchronise the blockchain. This means that if you are only interested in transactions in the last 3 months, you can only synchronise the last 3 months worth meaning less waiting time and you can start your development faster.

### What are the drawbacks of not starting from zero? 

The most obvious drawback will be that you won’t be able to query for data on the blockchain for blocks that you don’t have.

### How to figure out the current blockchain height?

If you are using the Polkadot network, you can visit [https://polkascan.io/](https://polkascan.io/), select the network, and then view the  "Finalised Block" figure.

### Do I have to do a rebuild or a codegen?

No. Because you are modifying the project.yaml file, which is essentially a configuration file, you will not have to rebuild or regenerate the typescript code. 

## How to change the blockchain fetching batch size?

### Video guide

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Introduction

The default batch size is 100, but this can be changed by using the extra command `--batch-size=xx`.

You need to this to the command line as an extra flag or if you are using Docker, modify the docker-compose.yml with:

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    restart: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - ./:/app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

This example sets the batch size to 50.

### Why change the batch size?

Using a smaller batch size can reduce memory usage and not leave users hanging for large queries. In otherwords, your application can be more responsive. However, more API calls are being made so if you are being charged on an I/O basis or if you have API limits somewhere in your chain, this could work to your disadvantage.

## How to run an indexer node?

### Video guide

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Introduction

Running an indexer node is another option outside of using Docker or having a project hosted for you at [SubQuery Projects](https://project.subquery.network/). It requires more time and effort but will enhance your understanding of how SubQuery works under the covers.

### Postgres
Running an indexer node on your infrastructure will require the setup of a Postgres database. You can install Postgres from [here]( https://www.postgresql.org/download/) and ensure the version is 12 or greater. 

### Install subql/node
Then to run a SubQuery node, run the following command:

```shell
npm install -g @subql/node
```

The -g flag means to install it globally which means on OSX, the location will be /usr/local/lib/node_modules.

Once installed, you can check the version by running:

```shell
> subql-node --version
0.19.1
```

### Setting DB configs

Next, you need to set the following environmental variables:

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

Of course, if you have different values for the above keys, please adjust accordingly. Note that the `env` command will display the current environment variables and that this process only sets these values temporarily. That is, they are only valid for the duration of the terminal session. To set them permanently, store them in your ~/bash_profile instead.

### Indexing a project

To start indexing a project, navigate into your project folder and run the following command:

```shell
subql-node -f .
```

If you do not have a project handy, `git clone https://github.com/subquery/subql-helloworld`. You should see the indexer node kick into life and start indexing blocks. 

### Inspecting Postgres

If you navigate to Postgres, you should see two tables created. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries` only contains 1 row which the indexer checks upon start up to “understand the current state” so it knows where to continue from. The `starter_entities` table contains the indexes. To view the data, run `select (*) from subquery_1.starter_entities`.

