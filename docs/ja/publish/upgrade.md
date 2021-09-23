# Deploy a New Version of your SubQuery Project

## Guidelines

Although you have the freedom to always upgrade and deploy new versions of your SubQuery project, please be considerate during this process if your SubQuery project is public for the world. Some key points to note:
- If your upgrade is a breaking change, either create a new project (e.g. `My SubQuery Project V2`) or give your community plenty of warning of the change through social media channels.
- Deploying a new SubQuery project version causes some downtime as the new version indexes the complete chain from the genesis block.

## Deploy Changes

Login to SubQuery Projects, and find the project that you want to deploy a new version of. You can choose to either deploy to the production or staging slot. These two slots are isolated environments and each has their own databases and synchronise independently.

We recommend deploying to your staging slot only for final staging testing or when you need to resync your project data. You can then promote it to production with zero downtime. You will find testing is faster when [running a project locally](../run/run.md) as you can more [easily debug issues](../tutorials_examples/debug-projects.md).

The staging slot is perfect for:
* Final validation of changes to your SubQuery Project in a separate environment. The staging slot has a different URL to production that you can use in your dApps.
* Warming up and indexing data for an updated SubQuery project to eliminate downtime in your dApp
* Preparing a new release for your SubQuery Project without exposing it publicly. The staging slot is not shown to the public in the Explorer and has a unique URL that is visible only to you.

![Staging slot](/assets/img/staging_slot.png)

#### Upgrade to the Latest Indexer and Query Service

If you just want to upgrade to the latest indexer ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) or query service ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) to take advantage of our regular performance and stability improvements, just select a newer versions of our packages and save. This will cause only a few minutes of downtime.

#### Deploy New Version of your SubQuery Project

Fill in the Commit Hash from GitHub (copy the full commit hash) of the version of your SubQuery project codebase that you want deployed. This will cause a longer downtime depending on the time it takes to index the current chain. You can always report back here for progress.

## Next Steps - Connect to your Project
Once your deployment has succesfully completed and our nodes have indexed your data from the chain, you'll be able to connect to your project via the displayed GraphQL Query endpoint.

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in browser playground to get started - [read more about how to user our Explorer here](../query/query.md).
