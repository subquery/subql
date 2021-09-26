# SubQuery 사전은 어떻게 작동하나요?

일반 사전 프로젝트의 모든 아이디어는 블록체인의 모든 데이터를 인덱싱하고 이벤트, 외부요인 및 해당 유형(모듈 및 메서드)을 블록 높이 순서대로 데이터베이스에 기록하는 것입니다. 그러면, 다른 프로젝트에서 `network.dictionary` 끝점을 매니페스트 파일에 정의된 기본 `network.endpoint` 을 대신하여 쿼리할 수 있습니다.

`network.dictionary` 끝점은 존재하는 경우에 SDK가 자동으로 감지하고 사용하는 선택적 매개변수입니다. `network.endpoint`는 필수이지만, 존재하지 않는다면 컴파일되지 않습니다.

[SubQuery 사전](https://github.com/subquery/subql-dictionary) 프로젝트를 예로 들면, [스키마](https://github.com/subquery/subql-dictionary/blob/main/schema.graphql) 파일은 3개의 엔티티; 외부, 이벤트, specVersion를 정의합니다. 이 3개의 엔터티에는 각각 6, 4, 2개의 필드가 있습니다. 이 프로젝트를 실행하면, 이러한 필드들이 데이터베이스 테이블에 반영됩니다.

![extrinsics table](/assets/img/extrinsics_table.png) ![events table](/assets/img/events_table.png) ![specversion table](/assets/img/specversion_table.png)

그런 다음 블록체인의 데이터는 이 테이블들에 저장되고 성능을 위해 인덱싱됩니다. 그러면 프로젝트가 SubQuery 프로젝트에서 호스팅되고, API 끝점을 매니페스트 파일에 추가할 수 있습니다.

## 프로젝트에 사전을 통합하는 방법은 무엇입니까?

메니페스트 네트워크 부분에 `dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot`를 추가하세요. 예시:

```shell
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

## 사전을 사용하지 않으면 어떻게 됩니까?

사전을 사용하지 않는 경우, 인덱서는 기본적으로 100인 `배치 크기` 플래그에 따라 polkadot API를 통해 모든 블록 데이터를 가져와 처리를 위해 버퍼에 배치합니다. 나중에, 인덱서는 버퍼에서 이러한 모든 블록을 가져오고 블록 데이터를 처리하는 동안, 이러한 블록의 이벤트 및 외부가 사용자 정의 필터와 일치하는지 확인합니다.

## 사전이 사용되면 어떻게 됩니까?

사전이 사용되면, 인덱서는 먼저 호출 및 이벤트 필터를 매개변수로 사용하고 이를 GraphQL 쿼리에 병합합니다. 그런 다음 사전의 API를 사용하여 특정 이벤트 및 외부 요소만 포함하는 관련 블록 높이 목록을 얻습니다. 기본값이 사용되는 경우 종종 이 값은 100보다 훨씬 작습니다.

예를 들어, 전송 이벤트를 인덱싱하는 상황을 상상해 보십시오. 모든 블록에 이 이벤트가 있는 것은 아닙니다(아래 이미지에서 블록 3과 4에는 전송 이벤트가 없습니다).

![dictionary block](/assets/img/dictionary_blocks.png)

사전을 사용하면 각 블록에서 전송 이벤트를 찾는 대신 프로젝트가 이를 건너뛸 수 있으므로, 블록 1, 2, 5만 건너뜁니다. 사전이 각 블록의 모든 호출 및 이벤트에 대한 미리 계산된 참조이기 때문입니다.

이것은 사전을 사용하면 인덱서가 체인에서 얻는 데이터의 양을 줄이고 로컬 버퍼에 저장된 "원치 않는" 블록의 수를 줄일 수 있음을 의미합니다. 그러나 기존 방법과 비교하여, 사전의 API에서 데이터를 가져오는 추가 단계가 추가됩니다.

## 사전이 유용하지 않은 경우는 언제입니까?

[블록 처리자](https://doc.subquery.network/create/mapping.html#block-handler)를 사용하여 체인에서 데이터를 가져오면, 모든 블록을 처리해야 합니다. 따라서, 이 경우에 사전을 사용하는 것은 어떠한 이점도 제공하지 않으며 인덱서는 자동으로 기본 비사전 접근 방식으로 전환합니다.

또한, `timestamp.set`과 같이 모든 블록에서 발생하거나 존재하는 이벤트 또는 외부를 처리할 때, 사전을 사용하는 것은 추가적인 이점을 제공하지 않습니다.
