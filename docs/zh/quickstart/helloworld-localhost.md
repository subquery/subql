# Hello World (本地主机 + Docker)

欢迎使用 SubQuery Hello World 快速启动。 快速入门旨在通过几个简单的步骤向您展示如何在 Docker 中运行默认的启动项目。

## 学习目标

在本快速入门结束时，您应该：

- 了解所需的先决条件
- 了解基本的常用命令
- 能够导航到 localhost:3000 并查看 playground
- 运行一个简单的查询来获取 Polkadot 主网的区块高度

## 目标受众

本指南面向具有一些开发经验并有兴趣了解更多关于 SubQuery 的新开发人员。

## 视频指南

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 先决条件

您会需要：

- yarn 或 npm 软件包管理器
- SubQuery CLI (`@subql/cli`)
- Docker

您可以在终端中运行以下命令来查看您是否已经拥有这些先决条件。

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

对于更高级的用户，复制并粘贴以下内容：

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

这应该返回：(对于 npm 用户，用 npm 替换 yarn）

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

如果你得到了上面的内容，那么你就可以开始了。 如果没有，请按照以下链接安装它们：

- [yarn](https://classic.yarnpkg.com/en/docs/install/) or [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. 步骤一：初始化项目

开始使用 SubQuery 的第一步是运行 `subql init` 命令。 让我们初始化一个名为 `subqlHelloWorld` 的启动项目。 请注意，只有作者是强制性的。 其他所有内容都在下面都是空着的。

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

请不要忘记切换到这个新目录。

```shell
cd subqlHelloWorld
```

## 2. 步骤2：安装依赖项

现在执行 yarn 或 node install 以安装各种依赖包。

<CodeGroup> # Yarn yarn install # NPM npm install

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
[1/4] 🔍  Resolving packages...
[2/4] 🚚  Fetching packages...
[3/4] 🔗  Linking dependencies...
[4/4] 🔨  Building fresh packages...
success Saved lockfile.
✨  Done in 31.84s.
```

## 3. 步骤4：生成代码

现在运行 `yarn codegen` 生成来自 GraphQL schema 的Typescript。

<CodeGroup> # Yarn yarn codegen # NPM npm run-script codegen

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
* Models index generated !
* Types index generated !
✨  Done in 1.02s.
```

**Warning** When changes are made to the schema file, please remember to re-run `yarn codegen` to regenerate your types directory.

## 4. `yarn build` 示例

下一步是使用 `yarn building` 来构建代码。

<CodeGroup> # Yarn yarn build # NPM npm run-script build

```shell
> yarn build
yarn run v1.22.10
$ tsc -b
✨  Done in 5.68s.
```

## 5. 运行 Docker

使用 Docker 可以让您非常快速地运行此示例，因为 Docker 中提供所有必需的基础设施。 运行 `docker-compose praw && docker-compose up`.

这将把一切都变成现实，最终，您将获得正在被获取的区块。

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
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. Browse playground

导航到 http://localhost:3000/， 并将下面的查询粘贴到屏幕左侧，然后点击播放按钮。

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

在 localhost 上的 SubQuery playground

![playground localhost](/assets/img/subql_playground.png)

Playground 中的区块计数也应与终端中的区块计数（严格来说是区块高度）相匹配。

## 概括

在这个快速入门中，我们演示了在 Docker 环境中启动和运行一个初始项目的基本步骤，然后导航到 localhost:3000，并运行查询以返回主网 Polkadot network 的区块号。
