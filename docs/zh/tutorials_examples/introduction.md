# 教程 &

这里我们将列出我们的教程，并探索各种示例来帮助你以最简单和最快的方式站起来和运行。

## SubQuery 示例

| 示例                                                                                       | 描述                                  | 主题                                                     |
| ---------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| [外部已完成块](https://github.com/subquery/subql-examples/tree/main/extrinsic-finalized-block) | 索引外观可以通过其散列进行查询                     | 带有 __块处理器__ 函数的最简单示例                                   |
| [区块时间戳](https://github.com/subquery/subql-examples/tree/main/block-timestamp)            | 索引每个最后一个块的时间戳                       | 另一个简单的 __调用处理器__ 函数                                    |
| [验证器阈值](https://github.com/subquery/subql-examples/tree/main/validator-threshold)        | 索引选择验证器所需的最低存档金额。                   | 更复杂的 __块处理器__ 函数让 __外部调用__ 到 `@polkadot/api` 获取更多链上的数据 |
| [合计奖励](https://github.com/subquery/subql-examples/tree/main/sum-reward)                  | 索引封存保证金、 奖励和从终结块事件中的斜线              | 更复杂的 __事件处理器__ 带有 __一对多的__ 关系                          |
| [实体关系](https://github.com/subquery/subql-examples/tree/main/entity-relation)             | 索引帐户间的平衡转移，同时索引实用工具批处理。所有以查找外在通话的内容 | __一对多__ 和 __多对多__ 关系和复杂 __外在处理__                       |
| [小工具](https://github.com/subquery/subql-examples/tree/main/kitty)                        | 索引工具包的出生信息。                         | 复杂的 __通话处理程序__ 和 __事件处理程序__, 数据索引来自 __自定义链__           |
