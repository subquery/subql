# Hướng dẫn & Các ví dụ

Ở đây chúng tôi sẽ liệt kê các hướng dẫn của chúng tôi và khám phá các ví dụ khác nhau để giúp bạn thiết lập và chạy một cách dễ dàng và nhanh nhất.

## Hướng dẫn



## Các dự án mẫu SubQuery

| Ví dụ                                                                                         | Miêu tả                                                                                                                  | Chủ đề                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [extrinsic-finalized-block](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | Lập chỉ mục ngoại vi để chúng có thể được truy vấn bằng hàm băm của chúng                                                | Ví dụ đơn giản nhất với hàm __block handler__                                                                                 |
| [block-timestamp](https://github.com/subquery/tutorials-block-timestamp)                      | Dấu thời gian lập chỉ mục của mỗi khối đã hoàn thành                                                                     | Another simple __call handler__ function                                                                                      |
| [validator-threshold](https://github.com/subquery/tutorials-validator-threshold)              | Indexes the least staking amount required for a validator to be elected.                                                 | More complicated __block handler__ function that makes __external calls__ to the `@polkadot/api` for additional on-chain data |
| [sum-reward](https://github.com/subquery/tutorials-sum-reward)                                | Indexes staking bond, rewards, and slashes from the events of finalized block                                            | More complicated __event handlers__ with a __one-to-many__ relationship                                                       |
| [entity-relation](https://github.com/subquery/tutorials-entity-relations)                     | Indexes balance transfers between accounts, also indexes utility batchAll to find out the content of the extrinsic calls | __One-to-many__ and __many-to-many__ relationships and complicated __extrinsic handling__                                     |
| [kitty](https://github.com/subquery/tutorials-kitty-chain)                                    | Indexes birth info of kitties.                                                                                           | Complex __call handlers__ and __event handlers__, with data indexed from a __custom chain__                                   |
