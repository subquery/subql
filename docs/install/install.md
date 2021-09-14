# Installing SubQuery

There are various components required when creating a SubQuery project. The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) tool is used to create SubQuery projects. The [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) component is required to run an indexer. The [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) library is required to generate queries.

## Install @subql/cli

The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) tool helps to create a project framework or scaffold meaning you don't have to start from scratch.  

Install SubQuery CLI globally on your terminal by using Yarn or NPM:

<code-group>
  <code-block title="YARN" active>
  ```shell
  yarn global add @subql/cli
  ```
  </code-block>

  <code-block title="NPM">
  ```bash
  npm install -g @subql/cli
  ```
  </code-block>
</code-group>

You can then run help to see available commands and usage provide by CLI:

```shell
subql help
```
## Install @subql/node

A SubQuery node is an implementation that extracts substrate-based blockchain data per the SubQuery project and saves it into a Postgres database.

Install SubQuery node globally on your terminal by using Yarn or NPM:

<code-group>
  <code-block title="YARN" active>
  ```shell
  yarn global add @subql/node
  ```
  </code-block>

  <code-block title="NPM">
  ```bash
  npm install -g @subql/node
  ```
  </code-block>
</code-group>

Once installed, you can can start a node with:

```shell
subql-node <command>
```
> Note: If you are using Docker or hosting your project in SubQuery Projects, you do can skip this step. This is because the SubQuery node is already provided in the Docker container and the hosting infrastructure. 

## Install @subql/query

The SubQuery query library provides a service that allows you to query your project in a "playground" environment via your browser. 

Install SubQuery query globally on your terminal by using Yarn or NPM:

<code-group>
  <code-block title="YARN" active>
  ```shell
  yarn global add @subql/query
  ```
  </code-block>

  <code-block title="NPM">
  ```bash
  npm install -g @subql/query
  ```
  </code-block>
</code-group>

> Note: If you are using Docker or hosting your project in SubQuery Projects, you do can skip this step also. This is because the SubQuery node is already provided in the Docker container and the hosting infrastructure. 