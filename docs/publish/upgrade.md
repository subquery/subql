# Deploy a New Version of your SubQuery Project

## Guidelines

Although you have the freedom to always upgrade and deploy new versions of your SubQuery project, please be considerate during this process if your SubQuery project is public for the world. Some key points to note:
- If your upgrade is a breaking change, either create a new project (e.g. `My SubQuery Project V2`) or give your community plenty of warning of the change through social media channels.
- Deploying a new SubQuery project version causes some downtime as the new version indexes the complete chain from the genesis block.

## Deploy Changes

Login to SubQuery Projects, and find the project that you want to deploy a new version to. Under Deployment Details you'll see three dots in the top right, click on the Deploy New Version button.

![Deploy new version to your Project](https://static.subquery.network/media/projects/projects-second-deployment.png)

#### Upgrade to the Latest Indexer and Query Service

If you just want to upgrade to the latest indexer ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) or query service ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) to take advantage of our regular performance and stability improvements, just select a newer versions of our packages and save. This will cause only a few minutes of downtime.

#### Deploy New Version of your SubQuery Project

Fill in the Commit Hash from GitHub (copy the full commit hash) of the version of your SubQuery project codebase that you want deployed. This will cause longer downtime depending on the time it takes to index the current chain. You can always report back here for progress.
