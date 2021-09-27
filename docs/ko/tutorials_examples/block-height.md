# 다른 블록 높이에서 시작하는 방법은 무엇입니까?

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 소개

기본적으로 모든 스타터 프로젝트는 제네시스 블록에서 블록체인 동기화를 시작합니다. 즉, 블록 1에서. 대규모 블록체인의 경우 완전히 동기화하는 데 일반적으로 며칠 또는 몇 주가 걸릴 수 있습니다.

0이 아닌 높이에서 동기화하는 SubQuery 노드를 시작하려면 project.yaml 파일을 수정하고 startBlock 키를 변경하기만 하면 됩니다.

아래는 시작 블록이 1,000,000으로 설정된 project.yaml 파일입니다.

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

## 왜 0에서 시작하지 않습니까?

주된 이유는 블록체인을 동기화하는 시간을 단축할 수 있기 때문입니다. 즉, 지난 3개월 동안의 거래에만 관심이 있다면 지난 3개월 동안만 동기화할 수 있어 대기 시간이 줄어들고 개발을 더 빨리 시작할 수 있습니다.

## 0에서 시작하지 않는 단점은 무엇입니까?

가장 명백한 단점은 가지고 있지 않은 블록에 대해 블록체인의 데이터를 쿼리할 수 없다는 것입니다.

## 현재 블록체인 높이를 파악하는 방법은 무엇입니까?

Polkadot 네트워크를 사용하는 경우 [https://polkascan.io/](https://polkascan.io/)를 방문하여 네트워크를 선택한 다음 "Finalised Block" 그림을 볼 수 있습니다.

## 다시 빌드하거나 codegen을 수행해야 합니까?

아니요. 본질적으로 구성 파일인 project.yaml 파일을 수정하기 때문에 typescript 코드를 다시 작성하거나 다시 생성할 필요가 없습니다.
