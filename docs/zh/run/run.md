# 在本地运行 SubQuery

本指南将介绍如何在基础设施上运行本地SubQuery节点，其中包括索引器和查询服务的使用。 不用担心在运行自己的SubQuery基础架构中所出现的问题。 SubQuery 向社区免费提供 [管理的托管服务](https://explorer.subquery.network)。 [按照我们所发布的指南](../publish/publish.md) 查看您如何将项目部署到 [SubQuery 项目](https://project.subquery.network)。

## 使用 Docker

An alternative solution is to run a <strong>Docker Container</strong>, defined by the `docker-compose.yml` file. For a new project that has been just initialised you won't need to change anything here. 对于刚刚初始化的新项目，您将不需要在此更改任何内容。

在项目目录下运行以下命令：

```shell
docker-compose pull && docker-compose up
```

第一次下载所需软件包可能需要一些时间([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/quiry`](https://www.npmjs.com/package/@subql/query), and Postgress) ，但很快你就会看到一个运行中的 SubQuery 节点。

## 运行Indexer (subql/node)

需求：

- [Postgres](https://www.postgresql.org/) 数据库 (版本12或更高). [Postgres](https://www.postgresql.org/) database (version 12 or higher). While the [SubQuery node](#start-a-local-subquery-node) is indexing the blockchain, the extracted data is stored in an external database instance.

SubQuery 节点需要一个加载的过程，它能够从 SubQuery 项目中提取基于子区块链的数据，并将其保存到 Postgres 数据库。

### 安装

```shell
# NPM
npm install -g @subql/node
```

请注意我们不鼓励使用 `yarn global` ，因为它的依赖性管理很差，这可能会导致错误。

安装完毕后，您可以使用以下命令来启动节点：

```shell
subql-node <command>
```

### 输入命令

The following commands will assist you to complete the configuration of a SubQuery node and begin indexing. To find out more, you can always run `--help`. 要了解更多信息，您可以运行 `--help`。

#### 指向本地项目路径

```
subql-node -f your-project-path
```

#### Using a Dictionary

Using a full chain dictionary can dramatically speed up the processing of a SubQuery project during testing or during your first index. In some cases, we've seen indexing performance increases of up to 10x. 在某些情况下，我们可以看到索引性能提高了10倍。

完整的链词库预先索引特定链中所有事件和外观的位置，并允许您的节点服务在索引时跳到相关位置，而不是检查每个区块。

您可以在`project.yaml`文件中添加字典端点（请参见[Manifest File](../create/manifest.md)），或在运行时使用以下命令指定它：

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[阅读更多关于 SubQuery 词典的工作原理](../tutorials_examples/dictionary.md)

#### Connect to database

```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
subql-node -f your-project-path 
````

Depending on the configuration of your Postgres database (e.g. a different database password), please ensure also that both the indexer (`subql/node`) and the query service (`subql/query`) can establish a connection to it.

#### Specify a configuration file

#### Specify a configuration file

```
subql-node -c your-project-config.yml
```

This will point the query node to a configuration file which can be in YAML or JSON format. Check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true Check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Change the block fetching batch size

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

When the indexer first indexes the chain, fetching single blocks will significantly decrease the performance. Increasing the batch size to adjust the number of blocks fetched will decrease the overall processing time. The current default batch size is 100. Increasing the batch size to adjust the number of blocks fetched will decrease the overall processing time. The current default batch size is 100.

#### Local mode

```
subql-node -f your-project-path --local
```

For debugging purposes, users can run the node in local mode. For debugging purposes, users can run the node in local mode. Switching to local model will create Postgres tables in the default schema `public`.

If local mode is not used, a new Postgres schema with the initial `subquery_` and corresponding project tables will be created.


#### Check your node health

There are 2 endpoints that you can use to check and monitor the health of a running SubQuery node.

- Health check endpoint that returns a simple 200 response
- Metadata endpoint that includes additional analytics of your running SubQuery node

Append this to the base URL of your SubQuery node. Eg `http://localhost:3000/meta` will return:

```bash
{
    "currentProcessingHeight": 1000699,
    "currentProcessingTimestamp": 1631517883547,
    "targetHeight": 6807295,
    "bestHeight": 6807298,
    "indexerNodeVersion": "0.19.1",
    "lastProcessedHeight": 1000699,
    "lastProcessedTimestamp": 1631517883555,
    "uptime": 41.151789063,
    "polkadotSdkVersion": "5.4.1",
    "apiConnected": true,
    "injectedApiConnected": true,
    "usingDictionary": false,
    "chain": "Polkadot",
    "specName": "polkadot",
    "genesisHash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    "blockTime": 6000
}
```

After running the subql-query service successfully, open your browser and head to `http://localhost:3000`. You should see a GraphQL playground showing in the Explorer and the schema that is ready to query.

A 500 error will be returned if the indexer is not healthy. This can often be seen when the node is booting up.

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

If an incorrect URL is used, a 404 not found error will be returned.

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### Debug your project

Use the [node inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/) to run the following command.

```shell
This guide works through how to run a local SubQuery node on your infrastructure, which includes both the indexer and query service. Don't want to worry about running your own SubQuery infrastructure? SubQuery provides a <a href="https://explorer.subquery.network">managed hosted service</a> to the community for free. <a href="../publish/publish.md">Follow our publishing guide</a> to see how you can upload your project to <a href="https://project.subquery.network">SubQuery Projects</a>.
```

For example:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
Then open up the Chrome dev tools, go to Source > Filesystem and add your project to the workspace and start debugging. For more information, check out [How to debug a SubQuery project](https://doc.subquery.network/tutorials_examples/debug-projects/)
## Running a Query Service (subql/query)

### Installation

```shell
# NPM
npm install -g @subql/query
```

Please note that we **DO NOT** encourage the use of `yarn global` due to its poor dependency management which may lead to an errors down the line.

### Running the Query service
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Make sure the project name is the same as the project name when you [initialize the project](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Also, check the environment variables are correct. Also, check the environment variables are correct.

After running the subql-query service successfully, open your browser and head to `http://localhost:3000`. You should see a GraphQL playground showing in the Explorer and the schema that is ready to query.
