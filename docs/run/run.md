# Running SubQuery Locally

This guide works through how to run a local SubQuery node on your own infrastructure, this includes both the indexer and query service.
Don't want to worry about running your own SubQuery infrastructure? SubQuery provides a [managed hosted service](https://explorer.subquery.network) to the community for free. [Follow our publishing guide](/publish/publish.md) to see how you can upload your project to [SubQuery Projects](https://project.subquery.network).

## Using Docker

An alternative solution is to run a <strong>Docker Container</strong>, defined by the `docker-compose.yml` file. For a new project that has been just initalised you won't need to change anything here.

Under the project directory run following command:
```shell
docker-compose pull && docker-compose up
```
It may take some time to download the required packages ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query), and Postgres) for the first time but soon you'll see a running SubQuery node.

## Running a Indexer (subql/node)

Requirements:
- [Postgres](https://www.postgresql.org/) database (version 12 or higher). As after [SubQuery node](#start-a-local-subquery-node) is indexing the blockchain, extracted data need to be stored in an external database instance.

SubQuery node is an implementation that extracts substrate-based blockchain data per the SubQuery project, and saves it into a Postgres database.

### Installation

```shell
# Yarn
yarn global add @subql/node

# NPM
npm install -g @subql/node
```

Once installed, you can can start a node

```shell
subql-node <command>
```

### Key Commands 

The following commands will assist you to complete the configuration of SubQuery node and begin indexing.
To find out more, you can always run `--help`.

#### Point to local project path
````
subql-node -f your-project-path 
````

#### Connect to database

````
export DB_USER=postgres 
export DB_PASS=postgres 
export DB_DATABASE=postgres 
export DB_HOST=localhost 
export DB_POST=5432
subql-node -f your-project-path 
````
Depending on the configuration of your Postgres database (e.g. a different database password), please ensure also that both the indexer (`subql/node`) and the query service (`subql/query`) is able to establish connection to it

#### Specify a configuration file

````
subql-node -c your-project-config.yml
````

This will point the query node to a configure file which can be in YAML or JSON format, check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Change the block fetching batch size

````
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
````

When the indexer first indexes the chain, fetching single blocks will significantly decrease the performance.
Increasing the batch-size to adjust the number of blocks fetched and will decrease the overall processing time.
Currently default batch-size been set to 100.

#### Local mode
````
subql-node -f your-project-path --local
````
For development debugging purpose, user can run the node in local mode. Switch to local model will create Postgres tables in default schema `public`.

If not using local mode, it will create a new Postgres schema with the initial `subquery_ ` and corresponding project tables.

## Running a Query Service (subql/query)

### Installation

```shell
# Yarn
yarn global add @subql/query

# NPM
npm install -g @subql/query
```

### Runing the Query service

````
export DB_HOST=localhost
subql-query --name <project_name> --playground
````
Make sure the project name is same as the project name when you [initialize the project](/quickstart.html#initialise-the-starter-subquery-project). Also check the environment variables are correct.

After running subql-query service successfully, open your browser and head to `http://localhost:3000`.

Finally, you should see a GraphQL playground showing in the Explorer and the schema that is ready to query.
