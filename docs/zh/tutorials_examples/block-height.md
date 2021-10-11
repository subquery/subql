# 如何从不同的区块高度开始？

## 视频教程

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 介绍

默认情况下，所有启动器项目都开始从创世区块同步区块链。 换句话说，从第一个区块开始。 对于大型区块链，这通常需要几天甚至几周才能完全同步。

要启动一个从非零高度区块同步的 SubQuery 节点，您必须做的只是修改project.yaml 文件并更改启动区块的密钥。

下面是一个 project.yaml 文件，启动区块已设置为 100,000 000。

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

## 为什么不从第零区块开始？

其主要原因是它可以减少同步区块链的时间。 这意味着如果您只对过去3个月的交易有兴趣。 您可以只同步过去3个月的记录，节省时间，您可以更快地开始您的发展。

## 不从零区块开始有什么缺点？

最明显的缺点是你将无法查询获取你没有同步的区块上的数据

## 如何识别当前区块的高度？

如果您正在使用 Polkadot 网络，您可以访问 [https://polkascan.io/](https://polkascan.io/)，选择网络，然后查看"最终区块"。

## 我是否需要重建，或者是编程？

不用 因为您正在修改 project.yaml 文件，它基本上是一个配置文件，您将不需要重建或重新生成类型代码。
