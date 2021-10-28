# SubQuery安装

创建SubQuery项目需要多个组件。 [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) 工具用于创建 SubQuery 项目。 [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) 组件是运行索引器所必需的。 [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) 库是生成查询所必需的。

## 安装@subql/cli节点

[@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) 脚手架有助于快速创建一个项目架构，您不必从头开始的手动创建项目。

使用 Yarn 或 NPM在您的电脑上全局安装 SubQuery CLI ：

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn global addition @subql/cli ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install -g @subql/cli ``` </CodeGroupItem> </CodeGroup></p>

然后您可以运行帮助查看可用的命令和使用 CLI：

```shell
subql help
```
## 安装@subql/cli节点

SubQuery 节点能够从 SubQuery 项目提取基于底层的区块链数据并将其保存到 Postgres 数据库。

使用 Yarn 或 NPM在您的终端上全局安装SubQuery节点：

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn global added @subql/node ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install -g @subql/node ``` </CodeGroupItem> </CodeGroup>

一旦安装完毕， 您可以用以下方式开始一个节点：

```shell
subql-node <command>
```
> 注意：如果使用 Docker或托管您的项目，您可以跳过这一步。 这是因为SubQuery 节点已经在 Docker 容器和主机基础设施中提供。

## 安装 @subql/query

SubQuery 查询库提供了一个服务，允许您通过浏览器在“playground”环境中查询您的项目。

使用 Yarn 或 NPM在您的终端上全局安装subql/query：

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn global add @subql/quick ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install -g @subql/quy ``` </CodeGroupItem> </CodeGroup>

> 注意：如果使用 Docker或托管您的项目，您可以跳过这一步。 这是因为SubQuery 节点已经在 Docker 容器和主机基础设施中提供。 