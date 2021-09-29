# 部署您的 SubQuery 项目的新版本

## 创作指南

尽管您可以随时升级和部署您的 SubQuery 项目的新版本， 如果您的 SubQuery 项目是为世界公开的，请在此过程中考虑。 需要注意的一些关键要点：
- 如果您的升级是一个突破性的变化，或者创建一个新的项目(例如) `我的 SubQuery 项目 V2`或通过社交媒体渠道向您的社区发出大量警告。
- 部署一个新的 SubQuery 项目版本会导致一些关闭时间，因为新版本会从起源区块索引整个链。

## 部署变更

Login to SubQuery Projects, and find the project that you want to deploy a new version of. Under Deployment Details you'll see three dots in the top right, click on the Deploy New Version button. You can choose to either deploy to the production or staging slot. These two slots are isolated environments and each has their own databases and synchronise independently.

We recommend deploying to your staging slot only for final staging testing or when you need to resync your project data. You can then promote it to production with zero downtime. You will find testing is faster when [running a project locally](../run/run.md) as you can more [easily debug issues](../tutorials_examples/debug-projects.md).

If you just want to upgrade to the latest indexer ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) or query service ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) to take advantage of our regular performance and stability improvements, just select a newer versions of our packages and save. This will cause only a few minutes of downtime.
* Final validation of changes to your SubQuery Project in a separate environment. The staging slot has a different URL to production that you can use in your dApps.
* Fill in the Commit Hash from GitHub (copy the full commit hash) of the version of your SubQuery project codebase that you want deployed. This will cause a longer downtime depending on the time it takes to index the current chain. You can always report back here for progress.
* Preparing a new release for your SubQuery Project without exposing it publicly. The staging slot is not shown to the public in the Explorer and has a unique URL that is visible only to you.

![Staging slot](/assets/img/staging_slot.png)

#### Upgrade to the Latest Indexer and Query Service

If you just want to upgrade to the latest indexer ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) or query service ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) to take advantage of our regular performance and stability improvements, just select a newer versions of our packages and save. This will cause only a few minutes of downtime.

#### Deploy New Version of your SubQuery Project

Fill in the Commit Hash from GitHub (copy the full commit hash) of the version of your SubQuery project codebase that you want deployed. This will cause a longer downtime depending on the time it takes to index the current chain. You can always report back here for progress.

## Next Steps - Connect to your Project
Once your deployment has succesfully completed and our nodes have indexed your data from the chain, you'll be able to connect to your project via the displayed GraphQL Query endpoint.

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in browser playground to get started - [read more about how to user our Explorer here](../query/query.md). There you can use the in browser playground to get started - [read more about how to user our Explorer here](../query/query.md).
