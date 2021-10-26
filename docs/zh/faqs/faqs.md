# 常见问题

## 什么是SubQuery？

SubQuery 是一个开放源代码项目，它允许开发者索引、转换和查询 Substrate 链数据为他们的应用程序提供动力。

SubQuery 还为开发者提供免费的项目生产级托管，免除人员配置基础设施的责任。 并让开发者能实现最佳的编写程序。

## SubQuery的最佳入门方式是什么？

开始使用 SubQuery 的最好方法是尝试我们的 [Hello World 教程](../quickstart/helloworld-localhost.md)。 这是一个简单的可下载启动模板，仅需5分钟即可入门构建项目。 然后使用 Docker 在您的本地主机上运行一个节点，运行一个简单的查询。

## 我如何向SubQuer贡献或反馈？

我们热爱社区的贡献和反馈。 若要贡献代码，请创建您感兴趣的分支，并在分支上做出更改。 然后提交 PR 或 Pull 请求。 这里提示下，不要忘记对于分钟的测试工作。 同时您可查看我们的贡献指南线 (TBA)。

要提供反馈，请通过 hello@subquery.network联系我们，或跳到我们的 [Discord频道](https://discord.com/invite/78zg8aBSMG)

## 在SubQuery项目中托管我的项目需要如何收费？

在 SubQuery 项目中托管您的项目是绝对免费的，这是我们回馈社区的方式。 要学习如何让我们一托管您的项目，请查看 [Hello World (SubQuery hosted)](../quickstart/helloworld-hosted.md) 教程。

## 什么是部署插槽？

部署位置是 [SubQuery 项目](https://project.subquery.network) 中的一个功能，相当于一个开发环境。 例如，在任何软件组织中，通常都有一种最起码的开发环境和生产环境(无视本地环境)。 Typically additional environments such as staging and pre-prod or even QA are included depending on the needs of the organisation and their development set up.

SubQuery currently has two slots available. A staging slot and a production slot. SubQuery currently has two slots available. A staging slot and a production slot. This allows developers to deploy their SubQuery to the staging environment and all going well, "promote to production" at the click of a button.

## What is the advantage of a staging slot?

The main benefit of using a staging slot is that it allows you to prepare a new release of your SubQuery project without exposing it publicly. You can wait for the staging slot to reindex all data without affecting your production applications. You can wait for the staging slot to reindex all data without affecting your production applications.

The staging slot is not shown to the public in the [Explorer](https://explorer.subquery.network/) and has a unique URL that is visible only to you. And of course, the separate environment allows you to test your new code without affecting production. And of course, the separate environment allows you to test your new code without affecting production.

## What are extrinsics?

If you are already familiar with blockchain concepts, you can think of extrinsics as comparable to transactions. More formally though, an extrinsic is a piece of information that comes from outside the chain and is included in a block. There are three categories of extrinsics. They are inherents, signed transactions, and unsigned transactions. More formally though, an extrinsic is a piece of information that comes from outside the chain and is included in a block. There are three categories of extrinsics. They are inherents, signed transactions, and unsigned transactions.

Inherent extrinsics are pieces of information that are not signed and only inserted into a block by the block author.

Signed transaction extrinsics are transactions that contain a signature of the account that issued the transaction. They stands to pay a fee to have the transaction included on chain. They stands to pay a fee to have the transaction included on chain.

Unsigned transactions extrinsics are transactions that do not contain a signature of the account that issued the transaction. Unsigned transactions extrinsics are transactions that do not contain a signature of the account that issued the transaction. Unsigned transactions extrinsics should be used with care because there is nobody paying a fee, becaused it is signed. Because of this, the transaction queue lacks economic logic to prevent spam. Because of this, the transaction queue lacks economic logic to prevent spam.

For more information, click [here](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).

## What is the endpoint for the Kusama network?

The network.endpoint for the Kusama network is `wss://kusama.api.onfinality.io/public-ws`.

## What is the endpoint for the Polkadot mainnet network?

The network.endpoint for the Polkadot network is `wss://polkadot.api.onfinality.io/public-ws`.
