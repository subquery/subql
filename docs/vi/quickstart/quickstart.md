# Hướng dẫn nhanh

Trong hướng dẫn Bắt đầu Nhanh này, chúng ta sẽ tạo một dự án khởi động đơn giản mà bạn có thể được sử dụng làm khuôn khổ để phát triển Dự án SubQuery cho chính mình.

Ở cuối hướng dẫn này, bạn sẽ có một dự án SubQuery đang hoạt động chạy trên nút SubQuery với điểm cuối GraphQL mà có thể truy vấn dữ liệu từ đó.

Nếu chưa có, chúng tôi khuyên bạn nên tự làm quen với [thuật ngữ](../#terminology) được sử dụng trong SubQuery.

## Sự chuẩn bị

### Môi trường phát triển địa phương

- [Chỉ định loại](https://www.typescriptlang.org/) được yêu cầu để biên dịch dự án và xác định các loại.
- Cả SubQuery CLI và Dự án đã tạo đều có phụ thuộc và yêu cầu phiên bản hiện đại [Node](https://nodejs.org/en/).
- SubQuery Nodes yêu cầu Docker

### Cài đặt CLI SubQuery

Cài đặt SubQuery CLI trên toàn cầu trên thiết bị đầu cuối của bạn bằng cách sử dụng NPM:

```shell
# NPM
npm install -g @subql/cli
```

Xin lưu ý rằng chúng tôi **KHÔNG** khuyến khích sử dụng `yarn toàn cầu` do việc quản lý phụ thuộc kém có thể dẫn đến sai sót trong dây chuyền.

Sau đó, bạn có thể chạy trợ giúp để xem các lệnh có sẵn và cách sử dụng do CLI cung cấp

```shell
subql help
```

## Khởi tạo Dự án SubQuery Starter

Bên trong thư mục mà bạn muốn tạo một dự án SubQuery, chỉ cần thay thế `PROJECT_NAME` bằng của riêng bạn và chạy lệnh:

```shell
subql init --starter PROJECT_NAME
```

Bạn sẽ được hỏi một số câu hỏi nhất định khi dự án SubQuery được khởi động:

- Kho lưu trữ Git (Tùy chọn): Cung cấp URL Git cho kho lưu trữ dự án SubQuery này (khi được lưu trữ trong SubQuery Explorer)
- RPC endpoint (Required): Provide a wss URL to a running RPC endpoint that will be used by default for this project. Bạn có thể nhanh chóng truy cập các điểm cuối công khai cho các mạng Polkadot khác nhau hoặc thậm chí tạo nút chuyên dụng riêng của mình bằng cách sử dụng [ OnFinality ](https://app.onfinality.io) hoặc chỉ sử dụng điểm cuối Polkadot mặc định.
- Tác giả (Bắt buộc): Nhập chủ sở hữu của dự án SubQuery này tại đây
- Mô tả (Tùy chọn): Bạn có thể cung cấp một đoạn văn ngắn về dự án của mình, mô tả dự án chứa dữ liệu gì và người dùng có thể làm gì với dự án
- Phiên bản (Bắt buộc): Nhập số phiên bản tùy chỉnh hoặc sử dụng giá trị mặc định (`1.0.0`)
- Giấy phép (Bắt buộc): Cung cấp giấy phép phần mềm cho dự án này hoặc chấp nhận mặc định (`Apache-2.0`)

Sau khi quá trình khởi tạo hoàn tất, bạn sẽ thấy một thư mục có tên dự án của bạn đã được tạo bên trong thư mục. Nội dung của Directoy này phải giống với những gì được liệt kê trong [ Cấu trúc Thư mục ](../create/introduction.md#directory-structure).

Cuối cùng, trong thư mục dự án, chạy lệnh sau để cài đặt các phụ thuộc của dự án mới.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell cd PROJECT_NAME yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash cd PROJECT_NAME npm install ``` </CodeGroupItem> </CodeGroup>

## Configure and Build the Starter Project

In the starter package that you just initialised, we have provided a standard configuration for your new project. You will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write your own SubQuery, check out our documentation under [Create a Project](../create/introduction.md)

### GraphQL Model Generation

In order to [index](../run/run.md) your SubQuery project, you must first generate the required GraphQL models that you have defined in your GraphQL Schema file (`schema.graphql`). Run this command in the root of the project directory.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

You'll find the generated models in the `/src/types/models` directory

## Build the Project

In order run your SubQuery Project on a locally hosted SubQuery Node, you need to build your work.

Run the build command from the project's root directory.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

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
