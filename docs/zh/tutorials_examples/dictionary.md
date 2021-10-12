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

## 当字典不使用时会发生什么？

未使用字典时， 一个索引器将根据默认为 100 的 `batch-size` 标记通过 polkadot api 获取每个区块数据， 并将此放置在缓冲区以供处理。 然后，当处理区块数据时，索引器将所有这些区块从缓冲区取出， 检查这些区块中的事件和外在内容是否匹配用户定义的过滤器。

## 使用字典时会发生什么情况？

When a dictionary IS used, the indexer will first take the call and event filters as parameters and merge this into a GraphQL query. It then uses the dictionary's API to obtain a list of relevant block heights only that contains the specific events and extrinsics. Often this is substantially less than 100 if the default is used.

For example, imagine a situation where you're indexing transfer events. Not all blocks have this event (in the image below there are no transfer events in blocks 3 and 4).

![dictionary block](/assets/img/dictionary_blocks.png)

The dictionary allows your project to skip this so rather than looking in each block for a transfer event, it skips to just blocks 1, 2, and 5. This is because the dictionary is a pre-computed reference to all calls and events in each block.

This means that using a dictionary can reduce the amount of data that the indexer obtains from the chain and reduce the number of “unwanted” blocks stored in the local buffer. But compared to the traditional method, it adds an additional step to get data from the dictionary’s API.

## When is a dictionary NOT useful?

When [block handlers](https://doc.subquery.network/create/mapping.html#block-handler) are used to grab data from a chain, every block needs to be processed. Therefore, using a dictionary in this case does not provide any advantage and the indexer will automatically switch to the default non-dictionary approach.

Also, when dealing with events or extrinsic that occur or exist in every block such as `timestamp.set`, using a dictionary will not offer any additional advantage.
