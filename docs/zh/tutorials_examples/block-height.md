# 如何从不同的区块高度开始？

## 视频教程

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 介绍

默认情况下，所有启动器项目都开始从创世区块同步区块链。 换句话说，从第一个区块开始。 对于大型区块链，这通常需要几天甚至几周才能完全同步。

To start a SubQuery node synchronising from a non-zero height, all you have to do is to modify your project.yaml file and change the startBlock key.

Below is a project.yaml file where the start block has been set to 1,000,000

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

## Why not start from zero?

The main reason is that it can reduce the time to synchronise the blockchain. This means that if you are only interested in transactions in the last 3 months, you can only synchronise the last 3 months worth meaning less waiting time and you can start your development faster.

## What are the drawbacks of not starting from zero?

The most obvious drawback will be that you won’t be able to query for data on the blockchain for blocks that you don’t have.

## How to figure out the current blockchain height?

If you are using the Polkadot network, you can visit [https://polkascan.io/](https://polkascan.io/), select the network, and then view the  "Finalised Block" figure.

## Do I have to do a rebuild or a codegen?

No. Because you are modifying the project.yaml file, which is essentially a configuration file, you will not have to rebuild or regenerate the typescript code.
