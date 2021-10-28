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

A SubQuery node is an implementation that extracts substrate-based blockchain data per the SubQuery project and saves it into a Postgres database.

Install SubQuery node globally on your terminal by using Yarn or NPM:

<CodeGroup> # Yarn yarn global add @subql/node # NPM npm install -g @subql/node
> Note: If you are using Docker or hosting your project in SubQuery Projects, you do can skip this step. This is because the SubQuery node is already provided in the Docker container and the hosting infrastructure. This is because the SubQuery node is already provided in the Docker container and the hosting infrastructure.

## Install @subql/query

The SubQuery query library provides a service that allows you to query your project in a "playground" environment via your browser.

Install SubQuery query globally on your terminal by using Yarn or NPM:

<CodeGroup> <CodeGroupItem title="YARN" active> # Yarn yarn global add @subql/query # NPM npm install -g @subql/query </CodeGroupItem>
<CodeGroupItem title="NPM"> subql-node &lt;command&gt; </CodeGroupItem> </CodeGroup>

> Note: If you are using Docker or hosting your project in SubQuery Projects, you do can skip this step also. This is because the SubQuery node is already provided in the Docker container and the hosting infrastructure. This is because the SubQuery node is already provided in the Docker container and the hosting infrastructure. 