# 다른 블록의 높이부터 시작하려면 어떻게 해야 하죠?

## 비디오 가이드

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## 소개

기본적으로 모든 스타터 프로젝트는 제네시스 블록에서 블록체인의 동기를 시작합니다. 즉, 블록1부터. 대규모 블록체인의 경우 완전히 동기화하는데 보통 며칠 또는 몇 주가 걸릴 수 있습니다.

SubQuery 서브 쿼리 노드를 제로 이외 의 높이 에서 동기화 를 시작 하려면 project.yaml 파일 을 수정 하고 startBlock 키를 변경 하기 만 하면 됩니다.

은 시작블록이 1,000,000으로 설정되어 있는 project.yaml 파일입니다

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

## 제로부터 시작해보는 게 어떤가요?

블록체인의 동기화 시간을 줄일 수 있다는 게 주된 이유입니다. 즉, 지난 3개월간의 거래에만 관심이 있는 경우 대기 시간이 적고 개발을 보다 빨리 시작할 수 있는 것은 지난 3개월뿐입니다.

## 처음부터 시작하지 않는 것의 단점은 무엇인가요?

가장 분명한 단점은 가지고 있지 않은 블록체인의 데이터를 조회할 수 없다는 것입니다.

## 현재 블록체인의 높이를 어떻게 계산하나요?

Polkadot 네트워크를 사용하고 있는 경우는,[https://polkascan.io/](https://polkascan.io/)에 액세스 해, "최종 블록"도를 표시할 수 있습니다.

## 재구축이나 코드 생성을 해야 하나요?

아니요. Project.yaml 파일은 기본적으로 구성 파일이므로 유형 스크립트 코드를 재구축 또는 재생성 할 필요가 없습니다.
