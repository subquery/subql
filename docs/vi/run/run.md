# Chạy SubQuery trên môi trường local

This guide works through how to run a local SubQuery node on your infrastructure, which includes both the indexer and query service. Don't want to worry about running your own SubQuery infrastructure? SubQuery provides a [managed hosted service](https://explorer.subquery.network) to the community for free. [Follow our publishing guide](../publish/publish.md) to see how you can upload your project to [SubQuery Projects](https://project.subquery.network).

## Sử dụng Docker

An alternative solution is to run a <strong>Docker Container</strong>, defined by the `docker-compose.yml` file. For a new project that has been just initialised you won't need to change anything here.

Trong thư mục dự án, hãy chạy lệnh sau:

```shell
docker-compose pull && docker-compose up
```

Trong lần đầu tiên có thể bạn sẽ mất chút thời gian để tải xuống các package cần thiết ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) và Postgres), nhưng sau đó node SubQuery sẽ nhanh chóng được khởi chạy.

## Khởi chạy bộ lập chỉ mục (Indexer) (subql/node)

Cần có:

- [Postgres](https://www.postgresql.org/) database (version 12 or higher). While the [SubQuery node](#start-a-local-subquery-node) is indexing the blockchain, the extracted data is stored in an external database instance.

Một node SubQuery sẽ triển khai trích xuất dữ liệu blockchain dựa trên chất nền (substrate) cho mỗi dự án SubQuery và lưu nó vào cơ sở dữ liệu Postgres.

### Cài đặt

```shell
# NPM
npm install -g @subql/node
```

Xin lưu ý rằng chúng tôi **KHÔNG** khuyến khích sử dụng `yarn global` vì khâu quản lý phụ thuộc của nó rất kém, có thể dẫn đến sai sót trong dây chuyền.

Sau khi cài đặt, bạn có thể khởi chạy một node bằng lệnh sau:

```shell
subql-node <command>
```

### Các lệnh chính

The following commands will assist you to complete the configuration of a SubQuery node and begin indexing. To find out more, you can always run `--help`.

#### Trỏ đến đường dẫn dự án trên môi trường local

```
subql-node -f your-project-path
```

#### Sử dụng Từ điển

Using a full chain dictionary can dramatically speed up the processing of a SubQuery project during testing or during your first index. In some cases, we've seen indexing performance increases of up to 10x.

Bộ từ điển này sẽ lập sẵn đầy đủ chỉ mục về vị trí của tất cả các sự kiện và yếu tố ngoại vi (extrinsics) trong blockchain liên quan và cho phép dịch vụ node của bạn chuyển đến các vị trí hợp lý khi lập chỉ mục thay vì phải kiểm tra từng block.

Bạn có thể trực tiếp thêm điểm cuối (endpoint) của từ điển vào tệp `project.yaml` (xem [Tệp kê khai (Manifest)](../create/manifest.md)) hoặc chỉ định điểm cuối tại thời điểm chạy bằng lệnh sau:

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[Read more about how a SubQuery Dictionary works](../tutorials_examples/dictionary.md).

#### Kết nối với cơ sở dữ liệu

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

```
subql-node -c your-project-config.yml
```

This will point the query node to a configuration file which can be in YAML or JSON format. Check out the example below.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Thay đổi kích thước lô tìm nạp block

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

When the indexer first indexes the chain, fetching single blocks will significantly decrease the performance. Increasing the batch size to adjust the number of blocks fetched will decrease the overall processing time. The current default batch size is 100.

#### Chế độ local

```
subql-node -f your-project-path --local
```

For debugging purposes, users can run the node in local mode. Switching to local model will create Postgres tables in the default schema `public`.

Xin lưu ý rằng chúng tôi **KHÔNG** khuyến khích sử dụng `yarn global` vì khâu quản lý phụ thuộc của nó rất kém, có thể dẫn đến sai sót trong dây chuyền.


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

`http://localhost:3000/health` will return HTTP 200 if successful.

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
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

For example:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
Then open up the Chrome dev tools, go to Source > Filesystem and add your project to the workspace and start debugging. For more information, check out [How to debug a SubQuery project](https://doc.subquery.network/tutorials_examples/debug-projects/)
## Khởi chạy Dịch vụ Truy vấn (subql/query)

### Cài đặt

```shell
# NPM
npm install -g @subql/query
```

Please note that we **DO NOT** encourage the use of `yarn global` due to its poor dependency management which may lead to an errors down the line.

### Menjalankan layanan Kueri
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Make sure the project name is the same as the project name when you [initialize the project](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Also, check the environment variables are correct.

After running the subql-query service successfully, open your browser and head to `http://localhost:3000`. You should see a GraphQL playground showing in the Explorer and the schema that is ready to query.
