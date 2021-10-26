# 常见问题

## 什么是SubQuery？

SubQuery 是一个开放源代码项目，它允许开发者索引、转换和查询 Substrate 链数据为他们的应用程序提供动力。

SubQuery 还为开发者提供免费的项目生产级托管，免除人员配置基础设施的责任。 并让开发者能实现最佳的编写程序。

## SubQuery的最佳入门方式是什么？

开始使用 SubQuery 的最好方法是尝试我们的 [Hello World 教程](../quickstart/helloworld-localhost.md)。 这是一个简单的可下载启动模板，仅需5分钟即可入门构建项目。 然后使用 Docker 在您的本地主机上运行一个节点，运行一个简单的查询。

## 我如何向SubQuer贡献或反馈？

我们热爱社区的贡献和反馈。 若要贡献代码，请创建您感兴趣的分支，并在分支上做出更改。 然后提交 PR 或 Pull 请求。 这里提示下，不要忘记对于分钟的测试工作。 同时您可查看我们的贡献指南线 (TBA)。

要提供反馈，请通过 hello@subquery.network联系我们，或进入我们的 [Discord 频道](https://discord.com/invite/78zg8aBSMG)

## 在SubQuery项目中托管我的项目需要如何收费？

在 SubQuery 项目中托管您的项目是绝对免费的，这是我们回馈社区的方式。 要学习如何让我们一托管您的项目，请查看 [Hello World (SubQuery hosted)](../quickstart/helloworld-hosted.md) 教程。

## 什么是部署插槽？

部署位置是 [SubQuery 项目](https://project.subquery.network) 中的一个功能，相当于一个开发环境。 例如，在任何软件组织中，通常都有一种最起码的开发环境和生产环境(无视本地环境)。 在典型的软件产品开发中，根据具体软件开发需求的要求，包括了其他环境，例如灰度环境、生产环境和测试环境等。

SubQuery 目前有两个可用的插槽。 一个中转插槽和一个生产插槽。 这使得开发人员可以将他们的 SubQuery 部署到模拟环境中，并且在点击按钮时“发布到生产环境”。

## 中转插槽的优点是什么？

使用中转插槽的主要好处是，它允许您准备新版本的 SubQuery 项目而不公开。 您可以等待中转插槽重新设置所有数据而不影响您的生产环境应用程序。

中转插槽不会在 [Explorer](https://explorer.subquery.network/) 中向公众展示，而且有一个唯一的URL，只有您可以看到。 当然，这个单独的环境允许您在不影响生产的情况下测试您的新代码。

## 什么是外部状态？

如果你已经熟悉区块链基本概念，你可以将外部状态理解为区块链中的交易。 但更加正式的理解是，外部状态是一种来自链外并被包含在一个区块中的信息。 外部状态的类别包含3种， 分别为：inherents、signed transactions、unsigned transactions。

Inherent外部状态是指未经签名且仅由区块作者插入区块的信息。

Signed transaction外部状态是指包含签发交易账户签名的交易。 该类型将支付一笔费用，以使得将该交易上链。

Unsigned transactions外部状态是指不包含交易账户签名的交易。 Unsigned transactions外部状态应当谨慎使用，该类型的外部状态没有人支付费用，因为它是signed的。 因此，该类型下交易队列缺乏防止欺骗的经济逻辑。

想了解更多信息，请点击 [这里](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics)。

## Kusama网络端点是什么？

Kusama 网络端点的介绍 `wss://kusama.api.onfinality.io/publicws`。

## Polkadot 主网的端点是什么？

Polkadot网络端点的介绍 `wss://polkadot.api.onfinality.io/publicws`。
