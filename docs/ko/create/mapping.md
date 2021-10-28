# 맵핑

매핑 기능는 체인데이터를 이전 `schema.graphql` 파일에 정의한 최적화된 GraphQL 엔티티로 변환하는 방법을 정의합니다.

- 매핑은 `src/mappings` 디렉토리에 정의되며 기능로 내보냅니다.
- 이들 매핑도 `src/index.ts`으로 수출 됩니다.
- 매핑 파일은 매핑 핸들러의 `project.yaml`으로 참조됩니다.

There are three classes of mappings functions; [Block handlers](#block-handler), [Event Handlers](#event-handler), and [Call Handlers](#call-handler).

## 블록 핸들러

You can use block handlers to capture information each time a new block is attached to the Substrate chain, e.g. block number. To achieve this, a defined BlockHandler will be called once for every block.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

A [SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) is an extended interface type of [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), but also includes the `specVersion` and `timestamp`.

## 이벤트 핸들러

You can use event handlers to capture information when certain events are included on a new block. The events that are part of the default Substrate runtime and a block may contain multiple events.

During the processing, the event handler will receive a substrate event as an argument with the event's typed inputs and outputs. Any type of event will trigger the mapping, allowing activity with the data source to be captured. You should use [Mapping Filters](./manifest.md#mapping-filters) in your manifest to filter events to reduce the time it takes to index data and improve mapping performance.

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

A [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) is an extended interface type of the [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Besides the event data, it also includes an `id` (the block to which this event belongs) and the extrinsic inside of this block.

## Call Handler

Call handlers are used when you want to capture information on certain substrate extrinsics.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). It is assigned an `id` (the block to which this extrinsic belongs) and provides an extrinsic property that extends the events among this block. Additionally, it records the success status of this extrinsic.

## Query 상태
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Therefore, we have exposed some of the @polkadot/api interfaces to increase capabilities.

These are the interfaces we currently support:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) 은,<strong>현재의</strong>> 블록을 조회합니다.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type)는 현재의 블록으로 <strong>같은</strong> 타입의 여러 Query를 생성합니다.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types)은 현재 블럭으로 <strong>다른</strong> 타입의 여러 Query를 생성합니다.

These are the interfaces we do **NOT** support currently:
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

See an example of using this API in our [validator-threshold](https://github.com/subquery/tutorials-validator-threshold) example use case.

## RPC 콜

We also support some API RPC methods that are remote calls that allow the mapping function to interact with the actual node, query, and submission. A core premise of SubQuery is that it's deterministic, and therefore, to keep the results consistent we only allow historical RPC calls.

Documents in [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) provide some methods that take `BlockHash` as an input parameter (e.g. `at?: BlockHash`), which are now permitted. We have also modified these methods to take the current indexing block hash by default.

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

To improve SubQuery's data processing capabilities, we have allowed some of the NodeJS's built-in modules for running mapping functions in the [sandbox](#the-sandbox), and have allowed users to call third-party libraries.

Please note this is an **experimental feature** and you may encounter bugs or issues that may negatively impact your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### 임베디드 모듈

Currently, we allow the following NodeJS modules: `assert`, `buffer`, `crypto`, `util`, and `path`.

Rather than importing the whole module, we recommend only importing the required method(s) that you need. Some methods in these modules may have dependencies that are unsupported and will fail on import.

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

Due to the limitations of the virtual machine in our sandbox, currently, we only support third-party libraries written by **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## 커스텀 Substrate 체인

SubQuery can be used on any Substrate-based chain, not just Polkadot or Kusama.

You can use a custom Substrate-based chain and we provide tools to import types, interfaces, and additional methods automatically using [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/tutorials-kitty-chain) to explain the integration process.

### 준비

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Follow the steps in [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) to retrieve a node's metadata from its **HTTP** endpoint.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
or from its **websocket** endpoint with help from [`websocat`](https://github.com/vi/websocat):

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/tutorials-kitty-chain), we have created `api-interface/kitty.json`.

#### 유형 정의
We assume that the user knows the specific types and RPC support from the chain, and it is defined in the [Manifest](./manifest.md).

Following [types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), we create :
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

Here is a simplified version of `package.json`. Make sure in the **scripts** section the package name is correct and the directories are valid.

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

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# 새로운 의존성을 설치하기 위한 Yarn
실

# 유형 생성
원사 생성: defs
```

In each modules folder (eg `/kitties`), there should now be a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` that exports them all.

```shell
# 메타데이터 생성
yarn generate:meta
```

This command will generate the metadata and a new api-augment for the APIs. As we don't want to use the built-in API, we will need to replace them by adding an explicit override in our `tsconfig.json`. After the updates, the paths in the config will look like this (without the comments):

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

Now in the mapping function, we can show how the metadata and types actually decorate the API. The RPC endpoint will support the modules and methods we declared above. And to use custom rpc call, please see section [Custom chain rpc calls](#custom-chain-rpc-calls)
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

**If you wish to publish this project to our explorer, please include the generated files in `src/api-interfaces`.**

### 커스텀 체인 rpc 콜

To support customised chain RPC calls, we must manually inject RPC definitions for `typesBundle`, allowing per-spec configuration. You can define the `typesBundle` in the `project.yml`. And please remember only `isHistoric` type of calls are supported.
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
