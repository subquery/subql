# How to Run an Indexer Node?

## Video guide

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Introduction

Running an indexer node is another option outside of using Docker or having a project hosted for you at [SubQuery Projects](https://project.subquery.network/). It requires more time and effort but will enhance your understanding of how SubQuery works under the covers.

## Postgres

Running an indexer node on your infrastructure will require the setup of a Postgres database. You can install Postgres from [here]( https://www.postgresql.org/download/) and ensure the version is 12 or greater. 

## Install subql/node

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

## Setting DB configs

Next, you need to set the following environmental variables:

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

Of course, if you have different values for the above keys, please adjust accordingly. Note that the `env` command will display the current environment variables and that this process only sets these values temporarily. That is, they are only valid for the duration of the terminal session. To set them permanently, store them in your ~/bash_profile instead.

## Indexing a project

To start indexing a project, navigate into your project folder and run the following command:

```shell
subql-node -f .
```

If you do not have a project handy, `git clone https://github.com/subquery/subql-helloworld`. You should see the indexer node kick into life and start indexing blocks. 

## Inspecting Postgres

If you navigate to Postgres, you should see two tables created. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries` only contains 1 row which the indexer checks upon start up to “understand the current state” so it knows where to continue from. The `starter_entities` table contains the indexes. To view the data, run `select (*) from subquery_1.starter_entities`.
