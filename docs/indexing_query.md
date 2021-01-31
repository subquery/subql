# Indexing and Query

In this chapter, we will introduce how to indexing a configured SubQuery, there are two approaches:

- We support [hosted service](https://www.subquery.network/)(coming soon) for the SubQuery node. 

- Running a SubQuery node for local development

An alternative indexing solution with <strong>docker</strong> has provided in the [Quick start](/quickstart.html#index-and-query) chapter.   

## Preparation

- [Postgres](https://www.postgresql.org/) database 12 or higher. 
As after [SubQuery node](#start-a-local-subquery-node) indexing the blockchain, extracted data need to store in in an external database instance.

- [Hasura](https://hasura.io/) provide an instant, realtime GraphQL APIs over the Postgres. It will meet the current demands of interacting with stored chain data in database.


## Start a local SubQuery node
SubQuery node is an implementation that extract substrate-based blockchain data which designated from a SubQuery project, and update it into a Postgres database.

### Install it globally

````
npm install -g @subql/node
````
Once installation completed, you can execute it.

````
subql-node <command>
````

### Command-Line 

The following crucial commands will assist you to complete the configuration of SubQuery node and begin indexing.
To find out more available option, run `--help`.

#### Point to local project path
````
subql-node -f your-project-path 
subql-node -f your-project-tar.tgz
````
The acceptable project path can be either a directory or [packed project](/define_a_subquery.html#pack).


#### Connect to database

````
export DB_USER=postgres 
export DB_PASS=postgres 
export DB_DATABASE=postgres 
export DB_HOST=postgres 
export DB_POST=5432
subql-node -f your-project-path 
````
Depend on the setup configuration of your Postgres database, e.g. a different database password, to make sure the query node able to establish
connection to it, it will be mandatory to pass correct environment variables within the command.

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
````

#### Change the block fetching batch size
````
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
````
While indexer is idle and waiting data to process, fetch single block per time will significantly drawback the query node performance.
Therefore, increasing the batch-size to adjust the number of blocks fetch per time and increasing the preload will enhance the overall processing time.
Currently default batch-size been set to 100.

#### Local mode
````
subql-node -f your-project-path --local
````
For the development debugging purpose, user can run the node in local mode. Switch to local model will create tables in default schema `public`.

If not using local mode, it will create a new schema with the initial `subquery_ ` and corresponding project tables.
## Query

After running Hasura successfully,open your browser and head to `http://localhost:8080/console`.

Under the `DATA` tab, on the left top corner select the schema you just created, it usually named `public` if you used local mode, and `subquery_x` if not.

Then you can see the table is currently untracked, click on the `Track` button.

Finally, head to the `GRAPHQL` tab, in the explorer you should see the table is ready to query.

