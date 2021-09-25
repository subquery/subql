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

## RPC calls

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
- For [Custom Substrate Chains](#custom-substrate-chains) RPC calls, see [usage](#usage).

## Modules and Libraries

To improve SubQuery's data processing capabilities, we have allowed some of the NodeJS's built-in modules for running mapping functions in the [sandbox](#the-sandbox), and have allowed users to call third-party libraries.

Please note this is an **experimental feature** and you may encounter bugs or issues that may negatively impact your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### Built-in modules

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

### Third-party libraries

Due to the limitations of the virtual machine in our sandbox, currently, we only support third-party libraries written by **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Custom Substrate Chains

SubQuery can be used on any Substrate-based chain, not just Polkadot or Kusama.

You can use a custom Substrate-based chain and we provide tools to import types, interfaces, and additional methods automatically using [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty) to explain the integration process.

### Preparation

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

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty), we have created `api-interface/kitty.json`.

#### Type definitions
We assume that the user knows the specific types and RPC support from the chain, and it is defined in the [Manifest](./manifest.md).

Following [types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), we create :
- `src/api-interfaces/definitions.ts` - this exports all the sub-folder definitions

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - type definitions for the kitties module
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

#### Packages

- In the `package.json` file, make sure to add `@polkadot/typegen` as a development dependency and `@polkadot/api` as a regular dependency (ideally the same version). We also need `ts-node` as a development dependency to help us run the scripts.
- We add scripts to run both types; `generate:defs` and metadata `generate:meta` generators (in that order, so metadata can use the types).

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

### Type generation

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

In each modules folder (eg `/kitties`), there should now be a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` that exports them all.

```shell
# Generate metadata
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

### Usage

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

### Custom chain rpc calls

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
