# Hello World Explained

在 [Hello World quick start guide](helloworld-localhost.md)中，我们运行了一些简单的命令，并很快就启动并运行了一个示例。  这使您可以确保具备所有先决条件，并且可以使用本地 Playground 进行简单查询以从 SubQuery 获取您的第一个数据。 让我们来仔细看看所有这些命令的含义。

## subql init

我们运行的第一个命令是 `subql init --starter subqlHelloWorld`。

这个指令完成了繁重的工作，并为您创建了一大堆文件。 正如 [official documentation](quickstart.md#configure-and-build-the-starter-project)中所指出的那样，您将主要处理以下文件：

- `project.yaml `中的清单
- `schema.graphql `中的 GraphQL 架构
- `src/mappings/` 目录中的映射函数

![key subql files](/assets/img/main_subql_files.png)

这些文件是我们所做一切的核心。 因此，我们将在另一篇文章中花更多时间来介绍这些文件。 不过现在，只需要知道这样的模式包含了用户可以从 SubQuery API 请求的数据的描述，project yaml 文件包含了“配置”类型参数，当然还有包含了含有 typescript 的 mappingHandlers — 其 typescript 有转换数据的功能。

## yarn install

我们所做的下一个事情是 `yarn install`。 您也可以使用 `npm install` 。

> 一段简短的历史。  Node Package Manager 或 npm 最初于 2010 年发布，是 JavaScript 开发人员中非常流行的包管理器。 它是您在系统上安装 Node.js 时自动安装的默认包。  Yarn 最初由 Facebook 于 2016 年发布，旨在解决使用 npm（当时）的一些性能和安全缺陷。

真的 yarn 是查看 `package.json` 文件并下载其他依赖项。 yarn 所做的是查看 `package.json` 文件并下载各种其他依赖项。package.json 文件看起来没有很多依赖项，但是当您运行该命令时，您会注意到添加了 18,983 个文件。  这是因为每个依赖项也将有自己的依赖项。

![key subql files](/assets/img/dependencies.png)

## yarn codegen

然后我们运行 `yarn codegen` 或 `npm run-script codegen`。 这样做是为了获取 GraphQL 架构（在`schema.graphql`中）并生成相关的 typescript 模型文件（因此输出文件将具有 .ts 扩展名）。 您不应该更改这些生成的文件中的任何一个，只能更改源 `schema.graphql` 文件。

![key subql files](/assets/img/typescript.png)

## yarn build

然后执行`yarn build` or `npm run-script build` 。 这对于经验丰富的程序员来说应该很熟悉。 它创建一个分发文件夹，执行如准备部署的代码优化之类的事情。

![key subql files](/assets/img/distribution_folder.png)

## docker-compose

最后一步是组合 docker 命令 `docker-compose pra && docker-compose up` (也可以单独运行)。 `pull`命令从 Docker Hub 获取所有需要的图像， `up`命令启动容器。

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

当容器启动时，您会看到终端吐出大量文本，显示节点和 GraphQL 引擎的状态。 当你看到：

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

您就知道SubQuery节点已经开始同步。

## 概括

现在您已经了解了幕后发生的事情，问题是接下来该做什么？ 如果您有信心，可以开始学习 [create a project](../create/introduction.md)并详细了解三个关键文件。 清单文件、GraphQL架构和映射文件。

或者您可以继续我们的教程部分，我们将学习如何在 SubQuery 的托管基础架构上运行这个 Hello World 示例，我们将学习如何修改 start 块，我们将运行随时可用的开源项目来更深入地了解如何运行 SubQuery 项目。
