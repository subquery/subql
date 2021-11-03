# 配置文件

`project.yaml`清单文件可以看作是项目的入口点，它定义了关于SubQuery 如何索引和转换链数据的大部分细节。

该清单文件可以是YAML或JSON格式。 在本文档中，我们将在所有示例中使用YAML格式。 下面是`project.yaml`文件的标准示例。

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
- `network.dictionary`可选地提供全链字典的HTTP端点以加快处理-[了解SubQuery字典的工作方式](../tutorials_examples/dictionary.md)。
- `dataSources`定义要过滤和提取的数据以及要应用的数据转换的映射函数处理程序的位置。
  - `kind`目前只支持`substrate/Runtime`。
  - `startBlock`指定开始索引的块高度。
  - ` filter ` 将根据网络端点所规范的名称过滤要执行的数据源，请参阅 [ network filters ](#network-filters)
  - `mapping.handlers`将列出所有的[mapping functions](./mapping.md)及其相应的处理程序类型，以及附加的[mapping filters](#mapping-filters)。

## 网络筛选器

通常，用户创建一个SubQuery项目，使其能够在测试网和主网环境（例如Kusama和Polkadot）中都可以使用。 在不同的网络环境之间，一些设置可能会发生变化（例如索引起始块）。 因此，我们允许用户自定义数据源，这意味着一个SubQuery项目可以在多个不同的网络中使用。

用户可以在 `filter` 中通过添加`dataSources` 来决定在每个网络上运行哪个数据源。

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

## 过滤器映射

过滤器映射是一个非常有用的选项，是用决定哪些块、事件或外部程序将触发映射的过滤器。

映射函数只处理满足筛选条件的传入数据。 映射筛选的选项是可选状态，但我们推荐使用，因为它可以显著减少SubQuery项目处理的数据量，并提高索引性能。

```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

下表将说明不同处理程序支持的筛选器。

| 处理程序                                       | 支持的过滤器：                      |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |


-  模块和方法过滤器支持所有基于SubQery的平行链。
- 过滤器的`成功运行`需要一个布尔值，用于根据外部对象的成功状态进行过滤。
- `specVersion`过滤器指定板块的规格版本范围。 以下示例将描述如何设置版本范围。

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```

## 自定义链

你可以通过在`project.yaml`中添加链类型来索引自定义链中的数据。 在`network.types`中添加此区块链支持的特定类型。 我们支持Substrate 运行时模块使用的其他类型。

同样支持`typesAlias`, `typesBundle`, `typesChain`, 和 `typesSpec` 。

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
