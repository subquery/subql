# 创建子查询项目

在 [快速开始](/quickstart/quickstart.md) 指南， 我们很快地演示了一个榜样，让您知道什么是SubQuery以及它是如何运作的。 我们会在创建您的项目和您将要处理的关键文件时更仔细地查看工作流。

## 基本工作流
以下一些示例将假定您在 [快速启动](../quickstart/quickstart.md) 部分中成功初始化了启动器包。 从这个启动程序包，我们会走过标准进程来定制和执行您的 SubQuery 项目。

1. 使用 `subql init PROJECT_NAME` 初始化您的项目
2. 更新清单文件(`个项目。 aml`) 以包含关于您的 blockchain 以及您将要映射的实体的信息 - 查看 [清单文件](./manifest.md)
3. 在您的架构中创建 GraphQL 实体(`架构)。 定义您要提取和持续查询的数据形状的 rapphql`- 参见 [GraphQL Schema](./graphql.md)
4. 添加所有映射函数 (eg `映射处理器。 s`) 您想要调用来将链式数据转换为您已定义的 GraphQL 实体 - 查看 [映射](./mapping.md)
5. 生成，构建， 并发布代码到 SubQuery 项目 (或在您自己的本地节点中运行) - 在我们的快速启动指南中查看 [运行并查询您的启动项目](./quickstart.md#running-and-querying-your-starter-project)。

## 目录结构

下面的地图提供了运行 `init` 命令时子查询项目的目录结构概览。

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
  L .gitignore
```

例如：

![子查询目录结构](/assets/img/subQuery_directory_stucture.png)

## 代码生成

每当您更改您的 GraphQL 实体时，您必须通过以下命令重新生成您的类型目录。

```
yarn 编码器
```

这将创建一个新的目录(或更新现有的目录) `src/type` 其中包含您之前在 `scheme 中定义的每个类型生成的实体类别。 rapphql` 这些类别提供了安全类型实体加载， 读取并写入实体字段 - 在 [GraphQL Schema](./graphql.md) 中查看更多关于此进程的信息。

## 构建...

为了在本地托管的 SubQuery 节点上运行您的SubQuery 项目，您需要首先构建您的工作。

从项目的根目录运行构建命令。

```shell
# Yarn
yarn build

# NPM
npm run-script building
```

## 日志记录

`console.log` 方法**不再受支持**。 相反， `Logger` 模块已被注入到类型中，这意味着我们可以支持一个可以接受不同日志级别的日志器。

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

要使用 `logger.info` 或 `logger.warn`，只需将行放入您的映射文件。

![正在记录.信息](/assets/img/logging_info.png)

要使用 `logger.debug`, 需要一个额外的步骤。 将 `--log-level=debug` 添加到您的命令行。

如果您正在运行一个停靠容器，请将此行添加到您的 `docker-compose.yaml` 文件中。

![正在记录调试...](/assets/img/logging_debug.png)

您现在应该在终端屏幕上看到新的登录。

![正在记录调试...](/assets/img/subquery_logging.png)
