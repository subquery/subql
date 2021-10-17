# 配置文件

`project.yaml`清单文件可以看作是项目的入口点，它定义了关于SubQuery 如何索引和转换链数据的大部分细节。

The Manifest can be in either YAML or JSON format. In this document, we will use YAML in all the examples. Below is a standard example of a basic `project.yaml`. 在本文档中，我们将在所有示例中使用YAML格式。 下面是`project.yaml`文件的标准示例。

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing
  dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter is optional but suggested to speed up event processing
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network.endpoint`定义要索引的区块链的wss或ws端点-**必须是完整的存档节点**。
- `network.dictionary` optionally provides the HTTP endpoint of a full chain dictionary to speed up processing - see [Running an Indexer](../run/run.md#using-a-dictionary)
- `dataSources`定义要过滤和提取的数据以及要应用的数据转换的映射函数处理程序的位置。
  - `kind`目前只支持`substrate/Runtime`。
  - `startBlock`指定开始索引的块高度。
  - ` filter ` 将根据网络端点所规范的名称过滤要执行的数据源，请参阅 [ network filters ](#network-filters)
  - `mapping.handlers`将列出所有的[mapping functions](./mapping.md)及其相应的处理程序类型，以及附加的[mapping filters](#mapping-filters)。

## 网络筛选器

Usually the user will create a SubQuery and expect to reuse it for both their testnet and mainnet environments (e.g Polkadot and Kusama). Between networks, various options are likely to be different (e.g. index start block). Therefore, we allow users to define different details for each data source which means that one SubQuery project can still be used across multiple networks. 在不同的网络环境之间，一些设置可能会发生变化（例如索引起始块）。 因此，我们允许用户自定义数据源，这意味着一个SubQuery项目可以在多个不同的网络中使用。

Users can add a `filter` on `dataSources` to decide which data source to run on each network.

下方示例是Polkadot和Kusama网络中不同的数据源。

```yaml
...
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Create a template to avoid redundancy
definitions:
  mapping: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter:  #Optional
        specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # can reuse or change
```

## 映射过滤

映射过滤是一个非常有用的特性，是用决定哪些块、事件或外部程序将触发映射的过滤器。

映射函数只处理满足筛选条件的传入数据。 Only incoming data that satisfy the filter conditions will be processed by the mapping functions. Mapping filters are optional but are recommended as they significantly reduce the amount of data processed by your SubQuery project and will improve indexing performance.

```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

The following table explains filters supported by different handlers.

| Handler                                    | Supported filter             |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |


-  Module and method filters are supported on any substrate-based chain.
- The `success` filter takes a boolean value and can be used to filter the extrinsic by its success status.
- The `specVersion` filter specifies the spec version range for a substrate block. The following examples describe how to set version ranges. The following examples describe how to set version ranges.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```

## Custom Chains

You can index data from custom chains by also including chain types in the `project.yaml`. Declare the specific types supported by this blockchain in `network.types`. We support the additional types used by substrate runtime modules. Declare the specific types supported by this blockchain in `network.types`. We support the additional types used by substrate runtime modules.

`typesAlias`, `typesBundle`, `typesChain`, and `typesSpec` are also supported.

``` yml
specVersion: "0.0.1"
description: "This subquery indexes kitty's birth info"
repository: "https://github.com/onfinality-io/subql-examples"
schema: "./schema.graphql"
network:
  endpoint: "ws://host.kittychain.io/public-ws"
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]"
  }
# typesChain: { chain: { Type5: 'example' } }
# typesSpec: { spec: { Type6: 'example' } }
dataSources:
  - name: runtime
    kind: substrate/Runtime
    startBlock: 1
    filter:  #Optional
      specName: kitty-chain 
    mapping:
      handlers:
        - handler: handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
```
