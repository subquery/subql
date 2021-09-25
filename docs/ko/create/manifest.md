# Manifest 파일

Manifest `project.yaml` 파일은 프로젝트의 시작점으로 볼 수 있으며 SubQuery가 체인 데이터를 인덱스화 및 변환하는 방법에 대한 대부분의 세부사항을 정의합니다.

Manifest는 YAML 또는 JSON 형식 중 하나로 할 수 있습니다. 이 문서에서는 모든 예에서 YAML을 사용합니다. 다음으로 기본`project.yaml`의 표준 예를 나타냅니다.

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing
  dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter is optional but suggested to speed up event processing
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network.endpoint` 은 인덱스화하는 블록체인의 wss 또는 ws 엔드포인트를 정의합니다. **완전한 아카이브 노드여야 합니다**.
- `network.dictionary` optionally provides the HTTP endpoint of a full chain dictionary to speed up processing - see [Running an Indexer](../run/run.md#using-a-dictionary)
- `dataSources`는, 필터링 및 추출하는 데이터와 적용하는 데이터 변환의 매핑 기능 핸들러의 장소를 정의합니다.
  - `kind`은 현시점에서는 `substrate/Runtime`만 지원하고 있습니다.
  - `startBlock`은, 인덱스 붙임을 개시하는 블록의 높이를 지정합니다.
  - `filter`은, 실행하는 데이터 소스를 네트워크 엔드 포인트의 사양명으로 필터링 합니다, [network filters](#network-filters)참조
  - `mapping.handlers`에는, 모든[매핑 기능](./mapping.md)과 거기에 대응하는 핸들러 타입이 표시되어 [매핑 필터](#mapping-filters)가 추가됩니다.

## 네트워크 필터

일반적으로 사용자는 SubQuery를 생성하여 테스트넷 환경과 메인넷 환경 모두(Polkadot이나 Kusama)에서 재사용하기를 기대합니다. 네트워크간에서는 다양한 옵션(예. 인덱스 개시블록)이 다를 수 있습니다. 따라서 사용자가 각 데이터 원본에 대해 서로 다른 상세 정보를 정의할 수 있도록 하고 이는 하나의 SubQuery 프로젝트가 여전히 여러 네트워크에서 사용될 수 있음을 의미합니다.

유저는 `dataSources`에`filter`을 추가하고, 각 네트워크에서 실행하는 데이터 소스를 결정할 수 있습니다.

이제 Polkadot 네트워크와 Kusama 네트워크 모두에서 서로 다른 데이터 소스를 표시하는 예를 보여 줍니다.

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Create a template to avoid redundancy
definitions:
  mapping: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter:  #Optional
        specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # can reuse or change
```

## 매핑 필터

매핑 필터는 매핑 핸들러를 트리거하는 블록, 이벤트 또는 외인성을 결정하는데 매우 편리한 기능입니다.

매핑 기능에 의해서 처리되는 것은, 필터 조건을 채우는 착신 데이터 뿐입니다. 매핑 필터는 옵션이지만 SubQuery 프로젝트에서 처리되는 데이터 양이 대폭 줄어들고 인덱스 성능이 향상되므로 권장합니다.

```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

다음 표에 다양한 핸들러로 지원되는 필터를 나타냅니다.

| 핸들러                                      | 지원되는 필터                      |
| ---------------------------------------- | ---------------------------- |
| [블록 핸들러](./mapping.md#block-handler)     | `specVersion`                |
| [이벤트 핸들러](./mapping.md#event-handler)    | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler) | `module`,`method` ,`success` |


-  모듈 및 방법 필터는 임의의 Substrate 기반 체인으로 지원됩니다.
- `success` 필터는 부울값을 취해, 성공 스테이터스에 의해서 외부의 것을 필터링 하기 위해서 사용할 수 있습니다.
- `specVersion` 필터는 Substrate 블록의 스펙 버전 범위를 지정합니다. 다음으로 버전 범위를 설정하는 예를 제시하겠습니다.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```

## 커스텀 체인

`project.yaml`에 체인타입을 포함시키는 것으로 커스텀체인의 데이터를 인덱스화할 수도 있습니다. `network.types`으로, 이 블록체인으로 지원되는 특정 유형을 선언합니다. 저희는 Substrate 런타임 모듈에서 사용되는 추가 타입을 지원합니다.

`typesAlias`, `typesBundle`, `typesChain`, 와 `typesSpec` 도 지원 됩니다.

``` yml
specVersion: "0.0.1"
description: "This subquery indexes kitty's birth info"
repository: "https://github.com/onfinality-io/subql-examples"
schema: "./schema.graphql"
network:
  endpoint: "ws://host.kittychain.io/public-ws"
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]"
  }
# typesChain: { chain: { Type5: 'example' } }
# typesSpec: { spec: { Type6: 'example' } }
dataSources:
  - name: runtime
    kind: substrate/Runtime
    startBlock: 1
    filter:  #Optional
      specName: kitty-chain 
    mapping:
      handlers:
        - handler: handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
```
