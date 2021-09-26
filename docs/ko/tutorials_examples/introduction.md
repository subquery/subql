# 튜토리얼 & 예

여기에서 튜토리얼을 나열하고 가장 쉽고 빠른 방법으로 시작하고 실행하는 데 도움이 되는 다양한 예를 살펴보겠습니다.

## SubQuery Examples



## SubQuery예시 프로젝트

| 예시                                                                           | 설명                                                       | 주제                                                                                                                            |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [외부 종료 블록](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | 해시로 쿼리할 수 있도록 외부 항목을 인덱싱합니다.                             | __블록 처리기__ 함수가 있는 가장 간단한 예                                                                                                    |
| [블록 타임스탬프](https://github.com/subquery/tutorials-block-timestamp)            | 각 최종 블록의 인덱스 타임스탬프                                       | 또 다른 간단한 __call handler__ 함수                                                                                                  |
| [검증인 임계값](https://github.com/subquery/tutorials-validator-threshold)         | 검증인을 선출하는 데 필요한 최소 스테이킹 금액을 인덱싱합니다.                      | More complicated __block handler__ function that makes __external calls__ to the `@polkadot/api` for additional on-chain data |
| [합 보상](https://github.com/subquery/tutorials-sum-reward)                     | 스테이킹 본드, 리워드, 블록 완료 이벤트 슬래시 인덱스                          | __event handlers__ 관계가 있는 보다 복잡한 __one-to-many__                                                                              |
| [엔티티 관계](https://github.com/subquery/tutorials-entity-relations)             | 계정 간의 균형 전송을 색인화하고 유틸리티 batchAll을 색인화하여 외부 호출의 내용을 찾습니다. | __One-to-many__ 및 __many-to-many__ 관계 및 복잡한 __extrinsic handling__                                                            |
| [Kitty Chain](https://github.com/subquery/tutorials-kitty-chain)             | 색인 출생 정보 kitty.                                          | __call handlers__에서 인덱싱된 데이터가 있는 복잡한 __event handlers__ 및 __custom chain__                                                    |
