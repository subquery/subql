# 튜토리얼 & 예

여기에서 튜토리얼을 나열하고 가장 쉽고 빠른 방법으로 시작하고 실행하는 데 도움이 되는 다양한 예를 살펴보겠습니다.

## SubQuery Examples



## SubQuery 예들

| 예시                                                                                            | 설명                                                        | 주제                                                                                            |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [extrinsic-finalized-block](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | 해시로 query를 할 수 있도록 외부 항목을 인덱싱합니다.                         | __block handler__ 기능가 있는 가장 간단한 예                                                             |
| [block-timestamp](https://github.com/subquery/tutorials-block-timestamp)                      | 각 최종 블록의 인덱스 타임스탬프                                        | 또 다른 간단한 __call handler__ 기능                                                                  |
| [validator-threshold](https://github.com/subquery/tutorials-validator-threshold)              | 검증인을 선출하는 데 필요한 최소 스테이킹 금액을 인덱싱합니다.                       | 추가 온체인 데이터를 위해 `@polkadot/api`에 대한 __external calls__을 수행하는 보다 복잡한 __block handler__ 기능이 있습니다 |
| [sum-reward](https://github.com/subquery/tutorials-sum-reward)                                | 스테이킹 본드, 보상, 블록 완료 이벤트 슬래시 인덱스                            | __event handlers__ 관계가 있는 보다 복잡한 __one-to-many__                                              |
| [entity-relation](https://github.com/subquery/tutorials-entity-relations)                     | 계정 간의 균형 전송을 색인화하고, 유틸리티 batchAll을 색인화하여 외부 호출의 내용을 찾습니다. | __One-to-many__ 및 __many-to-many__ 관계 및 복잡한 __extrinsic handling__                            |
| [Kitty Chain](https://github.com/subquery/tutorials-kitty-chain)                              | Kitties의 인덱스 출생 정보.                                       | __call handlers__에서 인덱싱된 데이터가 있는 복잡한 __event handlers__ 및 __custom chain__                    |
