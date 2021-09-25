# 맵핑

매핑 기능는 체인데이터를 이전 `schema.graphql` 파일에 정의한 최적화된 GraphQL 엔티티로 변환하는 방법을 정의합니다.

매핑은 WASM (WebAssembly) 으로 컴파일할 수 있는 AssemblyScript라고 불리는 TypeScript의 서브셋에 기술됩니다.
- 매핑은 `src/mappings` 디렉토리에 정의되며 기능로 내보냅니다.
- 이들 매핑도 `src/index.ts`으로 수출 됩니다.
- 매핑 파일은 매핑 핸들러의 `project.yaml`으로 참조됩니다.

매핑 기능에는, [Block handlers](#block-handler), [Event Handlers](#event-handler), and [Call Handlers](#call-handler)의 3 개의 클래스가 있습니다.

## 블록 핸들러

블록 핸들러를 사용하여 새로운 블록이 Substrate 체인에 접속될 때마다 정보를 캡처할 수 있습니다, 예: 블록 번호. 이를 실현하기 위해 정의된 블록 핸들러가 블록마다 1회 호출됩니다.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) 은 [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/) 의 확장 인터페이스 타입 이지만, `specVersion` 및 `타임스탬프` 도 갖추고 있습니다.

## 이벤트 핸들러

이벤트 핸들러를 사용하여 특정 이벤트가 새 블록에 포함될 때 정보를 캡처할 수 있습니다. 디폴트 Substrate 런타임 및 블록의 일부인 이벤트에는 여러 이벤트가 포함될 수 있습니다.

처리중에 이벤트 핸들러는 이벤트 입력 및 출력타입을 가진 인수로서 Substrate 이벤트를 수신합니다. 임의의 유형의 이벤트가 매핑을 트리거하고 데이터 원본에서의 액티비티를 캡처할 수 있습니다. Manifest에서[Mapping Filters](./manifest.md#mapping-filters)을 사용하여 이벤트를 필터링하고 데이터 인덱스화에 걸리는 시간을 단축하고 매핑 퍼포먼스를 향상시켜야 합니다.

```ts
import {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Retrieve the record by its ID
    const record = new starterEntity(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
```

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30)은,[이벤트 기록](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149)의 확장 인터페이스 타입입니다. 이벤트 데이터 외에 `id `(이 이벤트가 속한 블록) 및 이 블록 내부의 외부를 포함합니다.

## Call Handler

Call handlers는 특정 Substrate 외부의 정보를 캡처할 경우에 사용합니다.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21)은 [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170)을 확장합니다. `id` (이 외인성이 속하는 블록) 이 할당되어 이 블록 간에 이벤트를 확장하는 외인성 속성이 제공됩니다. 또, 이 외인성의 성공 상황을 기록합니다.

## Query 상태
저희의 목표는 매핑 핸들러(상기의 3가지 인터페이스 이벤트 타입 이상) 에 대한 사용자의 모든 데이터 소스를 커버하는 것입니다. 따라서, 기능을 향상시키기 위해 일부 @polkadot/api 인터페이스를 공개했습니다.

현재 지원되는 인터페이스는 다음과 같습니다.
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) 은,<strong>현재의</strong>> 블록을 조회합니다.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type)는 현재의 블록으로 <strong>같은</strong> 타입의 여러 Query를 생성합니다.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types)은 현재 블럭으로 <strong>다른</strong> 타입의 여러 Query를 생성합니다.

현재 서포트하고 있는 **않은** 인터페이스는, 다음과 같습니다.
- ~~api.tx.*~~
- ~~api.derive.*~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.at~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.hash~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.range~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.sizeAt~~

See an example of using this API in our [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) example use case.

## RPC 콜

또한 매핑 기능이 실제 노드와 상호작용할 수 있도록 하는 원격호출인 일부 API RPC 방법을 지원합니다. SubQuery의 핵심 전제는 결정론적이기 때문에, 결과의 일관성을 유지하기 위해 RPC 호출 이력만을 허용하는 것입니다.

[JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) 의 문서에서는, `BlockHash`를 입력 파라미터로서 사용하는 방법가 몇개 준비되어 있습니다 (예. `at?: BlockHash`)는 허가가 되었습니다. 또한 기본적으로 현재의 인덱스 블록 해시를 사용하도록 이들 방법을 수정했다.

```typescript
// Let's say we are currently indexing a block with this hash number
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Original method has an optional input is block hash
const b1 = await api.rpc.chain.getBlock(blockhash);

// It will use the current block has by default like so
const b2 = await api.rpc.chain.getBlock();
```
- [Custom Substrate Chains](#custom-substrate-chains)RPC 콜에 대해서는,[usage](#usage)을 참조해 주세요.

## 모듈 및 라이브러리

SubQuery의 데이터 처리 기능을 개선하기 위해 일부 노드를 허용되었고, [sandbox](#the-sandbox)에서 매핑기능을 실행하기 위한 NodeJS의 삽입모듈로 사용자는 제 3자 라이브러리에 콜이 가능합니다.

이는 **experimental feature**으로 매핑 기능에 악영향을 미치는 버그 또는 문제가 발생할 가능성이 있음을 주의해 주십시오. [GitHub](https://github.com/subquery/subql) 에서 문제가 발생했을 경우는, 버그를 보고해 주세요.

### 임베디드 모듈

현재 다음 NodeJS 모듈을 허용합니다: `assert`, `buffer`, `crypto`, `util`, 와 `path`.

모듈 전체를 가져오기를 하는 것이 아니라 필요한 방법만 가져오기를 할 것을 권장합니다. 이러한 모듈의 일부 방식은 지원되지 않기 때문에 가져오기를 실패하는 의존관계가 있을 수 있습니다.

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### 제 3자의 라이브러리

샌드박스에 있는 가상 머신의 제한으로 인해 현재는 **CommonJS**이 생성한 제 3자 라이브러리만을 지원합니다.

ESM 를 디폴트로 사용하는 `@polkadot/*`과 같은**hybrid** 라이브러리도 서포트하고 있습니다. 그러나, 다른 라이브러리가 **ESM** 형식의 모듈에 의존하고 있는 경우, 가상 머신은**NOT** 컴파일 하고 에러를 반환합니다.

## 커스텀 Substrate 체인

SubQuery는 Polkadot이나 Kusama 뿐만 아니라 Substrate 기반의 체인에서도 사용이 가능합니다.

사용자 지정 Substrate 기반 체인을 사용할 수 있으며 [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/)을 사용하여 타입, 인터페이스 및 추가 방법을 자동으로 들여오게 하는 도구를 제공합니다.

In the following sections, we use our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty) to explain the integration process.

### 준비

프로젝트 `src` 폴더 아래에 새 디렉토리`api-interfaces` 를 생성하여 필요한 파일과 생성된 파일을 모두 저장합니다. 또한 `kitties`모듈에서 API에 데코레이션을 추가하기 위해`api-interfaces/kitties`디렉토리도 만듭니다.

#### Metadata

실제 API 엔드포인트를 생성하려면 Metadata가 필요합니다. Kitty의 예에서는 로컬 테스트망의 엔드포인트를 사용하여 추가 유형을 제공합니다. [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) 의 순서에 따라서, 노드의 Metadata를 **HTTP** 엔드 포인트에서 취득하세요.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
또는, **websocket** 엔드 포인트로부터 [`websocat`](https://github.com/vi/websocat)의 도움을 참조해 주세요:

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

다음에, 출력을 JSON 파일에 복사와 붙여넣기를 합니다. In our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty), we have created `api-interface/kitty.json`.

#### 유형 정의
여기에서는 사용자가 체인으로부터 특정 유형과 RPC 지원을 알고 있는 것을 전제로 하고 있으며 이는 [Manifest](./manifest.md)에서 정의되어 있습니다.

[ 유형 설정 ](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup)에 따라 다음을 생성합니다.
- < 0 > srcapi-interfaces definitions.ts < 0 >: 모든 서브폴더 정의를 내보냅니다.

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - kitties 모듈의 유형 정의
```ts
export default {
    // custom types
    types: {
        Address: "AccountId",
        LookupSource: "AccountId",
        KittyIndex: "u32",
        Kitty: "[u8; 16]"
    },
    // custom rpc : api.rpc.kitties.getKittyPrice
    rpc: {
        getKittyPrice:{
            description: 'Get Kitty price',
            params: [
                {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                },
                {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                }
            ],
            type: 'Balance'
        }
    }
}
```

#### 패키지

- `package.json` 파일, 개발 의존 관계로서 `@polkadot/typegen`를 추가해, 통상의 의존 관계로서 `@polkadot/api`을 추가합니다(같은 버전을 사용합니다). 또한 스크립트를 실행하는 데 도움이 되는 개발 종속성으로 ` ts-node ` 도 필요합니다.
- 두 유형을 모두 수행할 스크립트를 추가합니다: `generate:defs` 와 Metadata `generate:meta` 생성기(Metadata가 타입을 사용할 수 있도록 하기 위해입니다).

다음으로, `package.json` 패키지의 간이 버젼입니다. **scripts** 섹션의 패키지명이 올바르고, 디렉토리가 유효한 것을 확인합니다.

```json
{
  "name": "kitty-birthinfo",
  "scripts": {
    "generate:defs": "ts-node --skip-project node_modules/.bin/polkadot-types-from-defs --package kitty-birthinfo/api-interfaces --input ./src/api-interfaces",
    "generate:meta": "ts-node --skip-project node_modules/.bin/polkadot-types-from-chain --package kitty-birthinfo/api-interfaces --endpoint ./src/api-interfaces/kitty.json --output ./src/api-interfaces --strict"
  },
  "dependencies": {
    "@polkadot/api": "^4.9.2"
  },
  "devDependencies": {
    "typescript": "^4.1.3",
    "@polkadot/typegen": "^4.9.2",
    "ts-node": "^8.6.2"
  }
}
```

### 타이프 생성

준비가 완료되었으므로 타입과 Metadata를 생성할 준비가 되었습니다. 다음 명령을 수행합니다:

```shell
# 새로운 의존성을 설치하기 위한 Yarn
실

# 유형 생성
원사 생성: defs
```

각 모듈 폴더(예 `/kitties`)에는 이 모듈의 정의에서 모든 인터페이스를 정의하는 생성된 `types.ts` 이 있으며 모든 인터페이스를 내보내는 파일 `index.ts` 이 있습니다.

```shell
# 메타데이터 생성
yarn generate:meta
```

이 명령어는 API의 Metadata와 새로운 api-augment를 생성합니다. 임베디드 API를 사용하고 싶지 않기 때문에 `tsconfig.json`에 명시적인 오버라이드를 추가해 교체할 필요가 있습니다. 업데이트 후 설정 내 경로는 다음과 같습니다(코멘트 없이):

```json
{
  "compilerOptions": {
      // this is the package name we use (in the interface imports, --package for generators) */
      "kitty-birthinfo/*": ["src/*"],
      // here we replace the @polkadot/api augmentation with our own, generated from chain
      "@polkadot/api/augment": ["src/interfaces/augment-api.ts"],
      // replace the augmented types with our own, as generated from definitions
      "@polkadot/types/augment": ["src/interfaces/augment-types.ts"]
    }
}
```

### 사용방법

매핑 기능을 통해 Metadata와 타입이 실제로 API를 어떻게 장식하는지 보여줄 수 있습니다. RPC 엔드포인트는 위에서 선언한 모듈 및 방식을 지원합니다. 커스텀 rpc 콜을 사용하려면, 섹션 [Custom chain rpc calls](#custom-chain-rpc-calls)을 참조해 주세요.
```typescript
export async function kittyApiHandler(): Promise<void> {
    //return the KittyIndex type
    const nextKittyId = await api.query.kitties.nextKittyId();
    // return the Kitty type, input parameters types are AccountId and KittyIndex
    const allKitties  = await api.query.kitties.kitties('xxxxxxxxx',123)
    logger.info(`Next kitty id ${nextKittyId}`)
    //Custom rpc, set undefined to blockhash
    const kittyPrice = await api.rpc.kitties.getKittyPrice(undefined,nextKittyId);
}
```

**이 프로젝트를 탐색기에 공개하려면 생성된 파일을 `src/api-interfaces` 에 포함해야 합니다.**

### 커스텀 체인 rpc 콜

커스터마이즈된 체인RPC 콜을 지원하려면 `typesBundle` 의 RPC 정의를 수동으로 삽입하여 사양별 설정을 가능하게 해야 합니다. `project.yml` 에서 `typesBundle`을 정의할 수 있습니다. 또, `isHistoric` 타입의 콜만이 서포트되고 있는 것에 주의해 주세요.
```yaml
...
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]",
  }
  typesBundle: {
    spec: {
      chainname: {
        rpc: {
          kitties: {
            getKittyPrice:{
                description: string,
                params: [
                  {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                  },
                  {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                  }
                ],
                type: "Balance",
            }
          }
        }
      }
    }
  }

```
