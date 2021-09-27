# 快速入门指南

在本快速入门指南中，我们将创建一个简单的入门项目，您可以将其用作开发您自己的 SubQuery 项目的框架。

在本指南的最后，您将拥有一个在 SubQuery 节点上运行的可工作 的 SubQuery 项目，该节点具有一个可以从中查询数据的 GraphQL 端点。

如果您还没有准备好，我们建议您熟悉 SubQuery 中所使用的 [术语](../#terminology)。

## 准备工作

### 本地开发环境

- 编译项目和定义类型需要用到[Typescript](https://www.typescriptlang.org/) 。
- SubQuery CLI 和生成的项目都有依赖关系，并且需要一个现代版本 [Node](https://nodejs.org/en/)。
- SubQuery 节点需要 Docker

### 安装 SubQuery CLI

使用 NPM 在终端上全局安装 SubQuery CLI：

```shell
# NPM
npm install -g @subql/cli
```

请注意我们不鼓励使用 `yarn global` ，因为它的依赖性管理很差，这可能会导致错误。

然后，您可以运行帮助以查看 CLI 提供的可用命令和用法。

```shell
subql help
```

## 初始化 Starter SubQuery 项目

在您要创建 SubQuery 项目的目录中，只需将`PROJECT_NAME` 替换为您自己的项目名称并运行命令：

```shell
subql init --starter PROJECT_NAME
```

在初始化 SubQuery project 时，您会被问到一些问题：

- Git 存储库（可选）：提供指向此 SubQuery 项目的，并将在其中托管的存储库的 Git URL（当托管在 SubQuery Explorer 中时）
- RPC 端点(必填)：提供一个 wss URL 给一个正在运行的 RPC 端点，该端点将默认用于此项目。 您可以快速访问不同的 Polkadot 网络的公共端点，甚至可以使用 [OnFinality](https://app.onfinality.io) 或仅使用默认的 Polkadot 端点创建您自己的专用节点。
- 作者(必填)：在此处输入此 SubQuery 项目的所有者
- 描述(可选)：您可以提供一个简短的段落介绍您的项目，描述它包含哪些数据以及用户可以做些什么。
- 版本 (必填)：输入一个自定义版本号或使用默认版本(`1.0.0`)
- 许可证(必填)：提供此项目的软件许可或接受默认设置(`Apache-2.0`)

在初始化过程完成后，您应该看到目录内创建了一个项目名称的文件夹。 此目录的内容应该与 [Directory Structure](../create/introduction.md#directory-structure) 中列出的内容完全相同。

最后，在项目目录下，运行以下命令来安装新项目的依赖关系。

```shell
cd PROJECT_NAME

# Yarn
yarn install

# NPM
npm install
```

## 配置和构建入门项目

在您刚刚初始化的启动软件包中，我们为您的新项目提供了标准配置。 您将主要处理以下文件：

- `project.yaml 中的清单`
- `schema.graphql 的 GraphQL 架构`
- `src/mappings/` 目录中的映射函数

关于如何编写您自己的子查询的更多信息，请查阅 [Create a Project](../create/introduction.md) 下的我们的文档

### GraphQL 模型生成

为了 [索引](../run/run.md) 您的 SubQuery 项目，您必须首先生成您在 GraphQL Schema 文件中定义的 GraphQL 模型(`Schema)。 rachql`。 在项目目录的根目录中运行此命令。

```shell
# Yarn
yarn codegen

# NPM
npm run-script codegen
```

您将在 `/src/types/model` 目录中找到生成的模型

## 构建项目

为了在本地托管的 SubQuery 节点上运行您的 SubQuery 项目，您需要构建您的工作。

从项目的根目录运行构建命令。

```shell
# Yarn
yarn build

# NPM
npm run-script building
```

## 运行并查询您的启动项目

虽然您可以快速发布您的新项目到 [SubQuery Projects](https://project.subquery.network) 并使用我们的 [Explorer](https://explorer.subquery.network)进行查询， 本地运行 SubQuery 节点的最简单方法是 Docker 容器中， 如果你还没有 Docker，你可以从 [docker.com](https://docs.docker.com/get-docker/)安装它。

[_跳过它并将您的新项目发布到 SubQuery 项目中_](../publish/publish.md)

### 运行您的 SubQuery 项目

在此 `docker-compose.yml` 文件中定义了控制子查询节点如何运行的所有配置。 对于刚刚初始化的新项目，您无需在此处更改任何内容，但您可以在我们的 [Run a Project section](../run/run.md)部分阅读有关文件和设置的更多信息。

在项目目录下运行以下命令：

```shell
docker-compose pull && docker-compose up
```

下载所需软件包可能需要一些时间([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/quiry`](https://www.npmjs.com/package/@subql/query), and Postgress) ，但很快你会看到一个运行中的 SubQuery 节点。

### 查询您的项目

打开浏览器并前往 [http://localhost:3000](http://localhost:3000)。

您应该会看到 GraphQL playground 显示在资源管理器中，其模式是准备查询。 在 Playground 的右上角，您会找到一个*Docs*按钮，该按钮将打开文档绘图。 该文档是自动生成的，可帮助您查找实体和方法。

对于一个新的 SubQuery 入门项目，您可以尝试以下查询以了解其工作原理，或者 [了解更多关于 GraphQL 查询语言](../query/graphql.md)的信息。

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

## 下一步

恭喜，您现在有一个本地运行的 SubQuery 项目，该项目接受 GraphQL API 对示例数据的请求。 在下一个指南中， 我们会向您展示如何发布您的新项目到

SubQuery Projects/0> 并使用我们的 [Explorer](https://explorer.subquery.network) 进行查询</p>

[将您的新项目发布到 SubQuery Projects 。](../publish/publish.md)
