# Welcome to SubQuery!

**Flexible, reliable, and decentralised APIs for your web3 project**

SubQuery is an Open, Flexible, Fast and Universal data indexing framework for web3. Our mission is to help developers create the decentralised products of the future. 

SubQuery allows teams across multiple blockchain architectures to process and query their data. The project is inspired by the growth of data protocols serving the application layer and its aim is to help web3 projects build better dApps by allowing anyone to reliably find and consume data faster. Today, anyone can query and extract blockchain data from various supported networks in only minutes and at no cost.

The future is multi-chain - SubQuery is no different. SubQuery is well on our way to support all leading blockchain networks with support for the following:

- [Polkadot (and all Substrate networks)](https://subquery.network/doc/indexer/quickstart/quickstart_chains/polkadot.html)
- [Ethereum (and all EVM-compatible networks)](https://subquery.network/doc/indexer/quickstart/quickstart_chains/ethereum-gravatar.html)
- [Cosmos (and all CosmWasm and Ethermint networks)](https://subquery.network/doc/indexer/quickstart/quickstart_chains/cosmos-osmosis.html)
- [Algorand](https://subquery.network/doc/indexer/quickstart/quickstart_chains/algorand.html)
- [NEAR](https://subquery.network/doc/indexer/quickstart/quickstart_chains/near.html)
- [Stellar (including Soroban)](https://subquery.network/doc/indexer/quickstart/quickstart_chains/stellar.html)
- [Solana (Beta)](https://subquery.network/doc/indexer/quickstart/quickstart_chains/solana.html)
- [Starknet](https://subquery.network/doc/indexer/quickstart/quickstart_chains/starknet.html)
- [Concordium](https://subquery.network/doc/indexer/quickstart/quickstart_chains/concordium.html)

You can also use SubQuery to index data from multiple networks in any combination of the above SDKs. See our [Multi-Chain Indexing Quickstart](https://subquery.network/doc/indexer/quickstart/quickstart_multichain/galxe-nft.html) for more details.

## Get Started

### Create a SubQuery project

You can follow our [Quick Start Guide](https://subquery.network/doc/indexer/quickstart/quickstart.html) to learn how to create, initialize, build, and publish a new SubQuery Project using the `@subql/cli` tool.

### Learn and improve with our comprehensive documentation

Dig into every term, usecases, and best-practices that help you build a dApp which your users love. Take a look at our [detailed technical documentation](https://subquery.network/doc/indexer/build/introduction.html).

### Publish your SubQuery Project to the SubQuery Network

Take advantage of the decentralized SubQuery Network to host your project without managing any infrastructure. By publishing to the [SubQuery Network](https://app.subquery.network), you'll benefit from a reliable, scalable, cost-optimised, and censorship-resistant indexing service. Follow our comprehensive [publishing guide](https://subquery.network/doc/subquery_network/architects/publish.html) to learn how to upload your project to the network and start leveraging its distributed infrastructure today.

### Publish to managed hosting providers

If you prefer a managed hosting option for your indexer deployment, contact our managed hosting partners.
[Learn more](https://subquery.network/doc/indexer/run_publish/introduction.html#other-hosting-providers-in-the-subquery-community).

### Run your own Indexer and Query Service

[Follow our guide](https://subquery.network/doc/indexer/run_publish/run.html) to run your own SubQuery local node that you can use to debug, test, and run you own GraphQL server.
You're going to need to a Postgres database, a node to extract chain data, and a moderately powerful computer to run the indexer in the background.
You'll also use our custom-built GraphQL query service [`@subql/query`](https://www.npmjs.com/package/@subql/query) to interact with your SubQuery project.

## MCP (Beta)

You can also create, build and deploy SubQuery projects using [MCP (Model Context Protocol)](https://modelcontextprotocol.io/introduction). Our MCP integration provides all the same functionality as the CLI but works well with LLMs and AI IDEs such as Cursor.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=SubQuery&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBzdWJxbC9jbGkiLCJtY3AiXX0=)

[![VSCode Install MCP Server](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=SubQuery&inputs=%7B%22id%22%3A%22workingDirectory%22%2C%22type%22%3A%22promptString%22%2C%22description%22%3A%22Working%20Directory%22%7D&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22cwd%22%3A%22%24%7Binput%3AworkingDirectory%7D%22%2C%22args%22%3A%5B%22-y%22%2C%22%40subql%2Fcli%22%2C%22mcp%22%5D%7D)

### Manual configuration

For adding SubQuery MCP into other tools, the following command needs be run by the client.

```bash
npx -y @subql/cli mcp
```

An example manual configuration:

```json
"subquery": {
  "command": "npx",
  "args": ["-y", "@subql/cli", "mcp"]
}
```

## Components

This repository contains all the core components of the SubQuery SDK as well as the Substrate implementation. It includes the following packages:

* [`@subql/cli`](packages/cli) - The command line interface for SubQuery, used to create, build, and publish SubQuery projects
* [`@subql/node`](packages/node) - The Substrate SubQuery SDK, which provides the indexing functionality for Substrate-based chains
* [`@subql/node-core`](packages/node-core) - Core indexing functionality that is chain agnostic
* [`@subql/query`](packages/query) - The GraphQL query service for SubQuery projects, allowing you to interact with your indexed data.
* [`@subql/common`](packages/common) - Common utilities and types used across SubQuery packages
* [`@subql/common-substrate`](packages/common-substrate) - Common utilities and types specifically for Substrate-based chains
* [`@subql/types`](packages/types) - Type definitions for Substrate-based chains and SubQuery projects, including the project manifest and data models

For more detail on the specific network implementations please see their respective repositories:

* [`@subql/node-ethereum`](https://github.com/subquery/subql-ethereum)
* [`@subql/node-cosmos`](https://github.com/subquery/subql-cosmos)
* [`@subql/node-algorand`](https://github.com/subquery/subql-algorand)
* [`@subql/node-near`](https://github.com/subquery/subql-near)
* [`@subql/node-stellar`](https://github.com/subquery/subql-stellar)
* [`@subql/node-solana`](https://github.com/subquery/subql-solana)
* [`@subql/node-starknet`](https://github.com/subquery/subql-starknet)
* [`@subql/node-concordium`](https://github.com/subquery/subql-concordium)

### Other Components:

* [`@subql/query-subgraph`](https://github.com/subquery/query-subgraph/) - A Subgraph compatible query service for SubQuery projects.

## Support

We have a vibrant community of developers and users who are always ready to help. If you have any questions, issues, or need assistance, please reach out to us through the following channels:

- [Discord](https://discord.com/invite/subquery) - The best place to get help and discuss with the community
- [X](https://twitter.com/subquerynetwork)
- [Telegram](https://t.me/subquerynetwork)
- [YouTube](https://www.youtube.com/c/SubQueryNetwork)

## Contribute

We love contributions and feedback from the community. To contribute the code, we suggest starting by creating an issue in our main repository so we can give you support.

## Copyright

SubQuery is a project built with love from the team at [SubQuery](https://subquery.network) all the way from New Zealand 

Copyright © 2025 [SubQuery Pte Ltd](https://subquery.network) authors & contributors
