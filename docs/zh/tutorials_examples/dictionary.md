# SubQuery 字典如何工作？

一个通用字典项目的整个想法是从区块链中对所有数据进行索引并记录事件，插件及其类型(模块和方法)，并按区块高度排序。 另一个项目然后可以查询此 `network.dictionary ` endpoint，而不是默认 `network.endpoint` 定义在清单文件中。

`network. dictionary ` endpoint 是一个可选的参数，如果存在，SDK 将自动检测和使用。 `network.endpoint` 是强制性的，如果不存在，将不会编译。

将 [SubQuery dictionary](https://github.com/subquery/subql-dictionary) 项目作为示例。 [schema](https://github.com/subquery/subql-dictionary/blob/main/schema.graphql) 文件定义了3个实体；外观、事件、旁观版本。 这3个实体分别含有6、4和2个字段。 当这个项目运行时，这些字段将反映在数据库表中。

![extrinsics table](/assets/img/extrinsics_table.png) ![events table](/assets/img/events_table.png) ![specversion table](/assets/img/specversion_table.png)

然后，区块链中的数据被存储在这些表中，可进行索引。 然后该项目托管在 SubQuery 项目中，API端点可以添加到清单文件。

## 如何将字典纳入您的项目中？

添加 ` dictionary: https://api.subquery.network/sq/subquery/dictiony-polkadot` 到清单的网络部分。 比如

```shell
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

## What happens when a dictionary IS NOT used?

When a dictionary is NOT used, an indexer will fetch every block data via the polkadot api according to the `batch-size` flag which is 100 by default, and place this in a buffer for processing. Later, the indexer takes all these blocks from the buffer and while processing the block data, checks whether the event and extrinsic in these blocks match the user-defined filter.

## What happens when a dictionary IS used?

When a dictionary IS used, the indexer will first take the call and event filters as parameters and merge this into a GraphQL query. It then uses the dictionary's API to obtain a list of relevant block heights only that contains the specific events and extrinsics. Often this is substantially less than 100 if the default is used.

For example, imagine a situation where you're indexing transfer events. Not all blocks have this event (in the image below there are no transfer events in blocks 3 and 4).

![dictionary block](/assets/img/dictionary_blocks.png)

The dictionary allows your project to skip this so rather than looking in each block for a transfer event, it skips to just blocks 1, 2, and 5. This is because the dictionary is a pre-computed reference to all calls and events in each block.

This means that using a dictionary can reduce the amount of data that the indexer obtains from the chain and reduce the number of “unwanted” blocks stored in the local buffer. But compared to the traditional method, it adds an additional step to get data from the dictionary’s API.

## When is a dictionary NOT useful?

When [block handlers](https://doc.subquery.network/create/mapping.html#block-handler) are used to grab data from a chain, every block needs to be processed. Therefore, using a dictionary in this case does not provide any advantage and the indexer will automatically switch to the default non-dictionary approach.

Also, when dealing with events or extrinsic that occur or exist in every block such as `timestamp.set`, using a dictionary will not offer any additional advantage.
