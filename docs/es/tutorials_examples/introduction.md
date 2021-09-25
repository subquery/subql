# Tutoriales & Ejemplos

Aquí listaremos nuestros tutoriales y exploraremos varios ejemplos para ayudarle a ponerse en marcha de la manera más fácil y rápida.

## SubQuery Examples



## Proyectos de Ejemplo de SubQuery

| Ejemplo                                                                                       | Descripción                                                                                                              | Topics                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [extrinsic-finalized-block](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | Indexes extrinsics so they can be queried by their hash                                                                  | The simplest example with a __block handler__ function                                                                        |
| [block-timestamp](https://github.com/subquery/tutorials-block-timestamp)                      | Indexes timestamp of each finalized block                                                                                | Another simple __call handler__ function                                                                                      |
| [validator-threshold](https://github.com/subquery/tutorials-validator-threshold)              | Indexes the least staking amount required for a validator to be elected.                                                 | More complicated __block handler__ function that makes __external calls__ to the `@polkadot/api` for additional on-chain data |
| [sum-reward](https://github.com/subquery/tutorials-sum-reward)                                | Indexes staking bond, rewards, and slashes from the events of finalized block                                            | More complicated __event handlers__ with a __one-to-many__ relationship                                                       |
| [entity-relation](https://github.com/subquery/tutorials-entity-relations)                     | Indexes balance transfers between accounts, also indexes utility batchAll to find out the content of the extrinsic calls | __One-to-many__ and __many-to-many__ relationships and complicated __extrinsic handling__                                     |
| [kitty](https://github.com/subquery/tutorials-kitty-chain)                                    | Indexes birth info of kitties.                                                                                           | Complex __call handlers__ and __event handlers__, with data indexed from a __custom chain__                                   |
