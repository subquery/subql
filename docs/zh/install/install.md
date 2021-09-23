# Installing SubQuery

There are various components required when creating a SubQuery project. The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) tool is used to create SubQuery projects. There are various components required when creating a SubQuery project.  The [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) component is required to run an indexer. The [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) library is required to generate queries. The [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) library is required to generate queries.

## Install @subql/cli

The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) library helps to create a project framework or scaffold meaning you don't have to start from scratch.

Install SubQuery CLI globally on your terminal by using Yarn or NPM:

<CodeGroup> # Yarn yarn global add @subql/cli # NPM npm install -g @subql/cli
## Install @subql/node

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