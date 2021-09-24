# Hello World (localhost + Docker)

Welcome to this SubQuery Hello World quick start. The quick start aims to show you how you get the default starter project running in Docker in a few simple steps.

## Mục tiêu học tập

Khi kết thúc phần quick start này, bạn sẽ:

- hiểu các yêu cầu bắt buộc
- hiểu các lệnh phổ biến cơ bản
- có thể xem localhost: 3000 và xem playground
- chạy một truy vấn đơn giản để lấy chiều cao khối của mạng chính Polkadot

## Đối tượng mục tiêu

Hướng dẫn này hướng tới các nhà phát triển mới đã có một số kinh nghiệm phát triển và muốn tìm hiểu thêm về SubQuery.

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Điều kiện tiên quyết

Bạn sẽ cần:

- yarn or npm package manager
- SubQuery CLI (`@subql/cli`)
- Docker

Bạn có thể chạy các lệnh sau trong một thiết bị đầu cuối để xem liệu bạn đã có bất kỳ điều kiện tiên quyết nào trong số này chưa.

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

Đối với người dùng nâng cao hơn, hãy sao chép và dán nội dung sau:

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

Điều này sẽ trả về: (đối với người dùng npm, thay thế yarn bằng npm)

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

If you get the above, then you are good to go. If not, follow these links to install them:

- [yarn](https://classic.yarnpkg.com/en/docs/install/) or [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. Initialise project

The first step when starting off with SubQuery is to run the `subql init` command. Let's initialise a start project with the name `subqlHelloWorld`. Note that only author is mandatory. Everything else is left empty below.

```shell
> subql init --starter subqlHelloWorld
Git repository:
RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description:
Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

Đừng quên thay đổi thành thư mục mới này.

```shell
cd subqlHelloWorld
```

## 2. Install dependencies

Bây giờ yarn hoặc node install để cài các phụ thuộc khác nhau.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install ``` </CodeGroupItem> </CodeGroup>

An example of `yarn install`

```shell
> yarn install
yarn install v1.22.10
info No lockfile found.
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 31.84s.
```

## 3. Generate code

Bây giờ, hãy chạy `yarn codegen` để generate Typescript từ giản đồ GraphQL.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

An example of `yarn codegen`

```shell
> yarn codegen
yarn run v1.22.10
$ ./node_modules/.bin/subql codegen
===============================
---------Subql Codegen---------
===============================
* Schema StarterEntity generated !
* Models index generated !
* Types index generated !
✨  Done in 1.02s.
```

**Cảnh báo** Khi các thay đổi được thực hiện đối với tệp giản đồ, hãy nhớ chạy lại `yarn codegen` để tạo lại thư mục loại của bạn.

## 4. Build code

Bước tiếp theo là xây dựng mã với `yarn build`.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

An example of `yarn build`

```shell
> yarn build
yarn run v1.22.10
$ tsc -b
✨  Done in 5.68s.
```

## 5. Run Docker

Using Docker allows you to run this example very quickly because all the required infrastructure can be provided within the Docker image. Run `docker-compose pull && docker-compose up`.

Điều này sẽ thúc đẩy mọi thứ vào cuộc sống, nơi cuối cùng bạn sẽ nhận được các khối đang được nạp.

```shell
> #SNIPPET
subquery-node_1   | 2021-06-05T22:20:31.450Z <subql-node> INFO node started
subquery-node_1   | 2021-06-05T22:20:35.134Z <fetch> INFO fetch block [1, 100]
subqlhelloworld_graphql-engine_1 exited with code 0
subquery-node_1   | 2021-06-05T22:20:38.412Z <fetch> INFO fetch block [101, 200]
graphql-engine_1  | 2021-06-05T22:20:39.353Z <nestjs> INFO Starting Nest application...
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. Browse playground

Vào trang web http://localhost:3000/ và dán truy vấn bên dưới vào bên trái màn hình rồi nhấn nút play.

```
{
 query{
   starterEntities(last:10, orderBy:FIELD1_ASC ){
     nodes{
       field1
     }
   }
 }
}

```

Sân chơi SubQuery trên localhost.

![playground localhost](/assets/img/subql_playground.png)

Số khối trong playground cũng phải khớp với số khối (về mặt kỹ thuật là chiều cao khối) trong thiết bị đầu cuối.

## Tóm lược

Trong phần quick start này, chúng tôi đã trình bày các bước cơ bản để thiết lập và chạy một dự án mới bắt đầu trong môi trường Docker, sau đó điều hướng đến localhost: 3000 và chạy một truy vấn để trả về số khối của mạng Polkadot mainnet.
