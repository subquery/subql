# 本地运行 SubQuery

本指南通过如何在您的基础设施上运行本地的 SubQuery 节点，其中包括索引器和查询服务。 不用担心在运行自己的SubQuery基础架构中所出现的问题。 SubQuery 向社区免费提供 [管理的托管服务](https://explorer.subquery.network)。 [按照我们所发布的指南](../publish/publish.md) 查看您如何将项目部署到 [SubQuery 项目](https://project.subquery.network)。

## 使用 Docker

其中一种解决方案是运行<strong>Docker容器</strong>，它是由`Docker-component.yml`文件所定义的。 对于刚刚初始化的新项目，您将不需要在此更改任何内容。

在项目目录下运行以下命令：

```shell
docker-compose pull && docker-compose up
```

第一次下载所需软件包可能需要一些时间([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/quiry`](https://www.npmjs.com/package/@subql/query), and Postgress) ，但很快你就会看到一个运行中的 SubQuery 节点。

## 运行Indexer (subql/node)

需求：

- [Postgres](https://www.postgresql.org/) 数据库 (版本12或更高). 当[SubQuery node](#start-a-local-subquery-node)  对区块链进行索引时，提取的数据将会存储在外部数据库实例中。

SubQuery 节点需要一个加载的过程，它能够从 SubQuery 项目中提取基于子区块链的数据，并将其保存到 Postgres 数据库。

### 安装

```shell
# NPM
npm install -g @subql/node
```

请注意我们不推荐使用 `yarn global` ，因为它的依赖管理性能不佳，可能导致在运行中出现错误。

安装完毕后，您可以使用以下命令来启动节点：

```shell
subql-node <command>
```

### 输入命令

以下命令将帮助您完成子查询节点的配置并开始索引。 要了解更多信息，您可以运行 `--help`。

#### 指向本地项目路径

```
subql-node -f your-project-path
```

#### 使用字典

Using a full chain dictionary can dramatically speed up the processing of a SubQuery project during testing or during your first index. In some cases, we've seen indexing performance increases of up to 10x. 在特定情况下，我们可以看到索引性能提高了10倍。

完整的链词库预先索引特定链中所有事件和外观的位置，并允许您的节点服务在索引时跳到相关位置，而不是检查每个区块。

您可以在`project.yaml`文件中添加字典端点（请参见[Manifest File](../create/manifest.md)），或在运行时使用以下命令指定它：

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[阅读更多关于 SubQuery 词典的工作原理](../tutorials_examples/dictionary.md)

#### 连接数据库

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
localMode:true 看看下面的例子。

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### 如何更改区块链批处理大小

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

When the indexer first indexes the chain, fetching single blocks will significantly decrease the performance. Increasing the batch size to adjust the number of blocks fetched will decrease the overall processing time. The current default batch size is 100. 增加批量处理的规模以调整获取的区块数量，这将会减少整个处理时间。 默认的批处理大小为100。

#### Local mode

```
subql-node -f your-project-path --local
```

当需要进行调试时，用户可以在本地模式下运行节点。 For debugging purposes, users can run the node in local mode. Switching to local model will create Postgres tables in the default schema `public`.

如果未使用本地模式，则使用初始的Postgres 模式，并将创建初始的 `subquery_` 和与其相对应的项目表。


#### 检查节点运行状况。

有两个端口可用来检查和监视所运行的 SubQuery 节点的健康状况。

- 返回普通 200 响应的健康检查端口
- Metadata端口，其中包括您正在运行的 SubQuery 节点的额外分析

将其附加到您的 SubQuery 节点的基本URL。 例如：`http://localhost:3000/meta` 将会返回

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

如果索引器出现错误，将返回500错误。 这通常可以在节点启动时看到。

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

如果使用了错误的URL，将返回404 not found错误。

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### 调试您的项目

使用 [node inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/) 来运行以下命令。

```shell
This guide works through how to run a local SubQuery node on your infrastructure, which includes both the indexer and query service. Don't want to worry about running your own SubQuery infrastructure? SubQuery provides a <a href="https://explorer.subquery.network">managed hosted service</a> to the community for free. <a href="../publish/publish.md">Follow our publishing guide</a> to see how you can upload your project to <a href="https://project.subquery.network">SubQuery Projects</a>.
```

例如：
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
然后打开Chrome开发工具，进入Source>Filesystem，将项目添加到工作区并开始调试。 查看更多信息[如何调试SubQuery项目](https://doc.subquery.network/tutorials_examples/debug-projects/)
## 运行Query服务(subql/query)

### 安装

```shell
# NPM
npm install -g @subql/query
```

请注意我们不推荐使用 `yarn global` ，因为它的依赖管理性能不佳，可能导致在运行中出现错误。

### 运行Query服务
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Make sure the project name is the same as the project name when you [initialize the project](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Also, check the environment variables are correct. 此外，请检查环境变量是否配置正确。

成功运行subql查询服务后，打开浏览器并转到`http://localhost:3000`. 您将会看到 GraphQL playground 会已准备查询的模式显示在资源管理器中。
