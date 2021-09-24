# Lập bản đồ

Các hàm ánh xạ xác định cách dữ liệu chuỗi được chuyển đổi thành các thực thể GraphQL được tối ưu hóa mà chúng tôi đã xác định trước đó trong tệp `schema.graphql`.

Các ánh xạ được viết trong một tập hợp con của TypeScript được gọi là AssemblyScript có thể được biên dịch thành WASM (WebAssembly).
- Các ánh xạ được định nghĩa trong thư mục `src / mappings` và được xuất dưới dạng một hàm
- Các ánh xạ này cũng được xuất dưới dạng `src / index.ts`
- Các tệp ánh xạ là tham chiếu trong `project.yaml` dưới trình xử lý ánh xạ.

Có ba lớp hàm ánh xạ; [Trình xử lý khối](#block-handler), [Trình xử lý sự kiện](#event-handler) và [ Trình xử lý cuộc gọi](#call-handler).

## Trình xử lý khối

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

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) là kiểu giao diện mở rộng của [signBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), nhưng cũng bao gồm `specVersion` và `timestamp`.

## Xử lý sự kiện

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

## Trình xử lý cuộc gọi

Trình xử lý cuộc gọi được sử dụng khi bạn muốn nắm bắt thông tin về một số ngoại vi chất nền nhất định.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). It is assigned an `id` (the block to which this extrinsic belongs) and provides an extrinsic property that extends the events among this block. Additionally, it records the success status of this extrinsic.

## Các trạng thái truy vấn
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Therefore, we have exposed some of the @polkadot/api interfaces to increase capabilities.

Đây là những giao diện chúng tôi hiện đang hỗ trợ:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) will query the <strong>current</strong> block.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) will make multiple queries of the <strong>same</strong> type at the current block.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) sẽ thực hiện nhiều truy vấn thuộc loại <strong>different</strong> tại khối hiện tại.

Đây là những giao diện mà chúng tôi **KHÔNG** hỗ trợ hiện tại:
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

Xem ví dụ về cách sử dụng API này trong trường hợp sử dụng mẫu [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) của chúng tôi.

## Cuộc gọi RPC

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
- Đối với [Chuỗi chất nền tùy chỉnh](#custom-substrate-chains) lệnh gọi RPC, hãy xem [usage](#usage).

## Mô-đun và Thư viện

Để cải thiện khả năng xử lý dữ liệu của SubQuery, chúng tôi đã cho phép một số mô-đun tích hợp của NodeJS chạy các chức năng ánh xạ trong [sandbox](#the-sandbox) và cho phép người dùng gọi các thư viện của bên thứ ba.

Please note this is an **experimental feature** and you may encounter bugs or issues that may negatively impact your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### Mô-đun tích hợp

Hiện tại, chúng tôi cho phép các mô-đun NodeJS sau: `assert`, `buffer`, `crypto`, `util` và `path`.

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

### Thư viện bên thứ ba

Do các hạn chế của máy ảo trong hộp cát của chúng tôi, hiện tại, chúng tôi chỉ hỗ trợ các thư viện của bên thứ ba được viết bởi **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Custom Substrate Chains

SubQuery có thể được sử dụng trên bất kỳ chuỗi nào dựa trên Substrate, không chỉ Polkadot hoặc Kusama.

Bạn có thể sử dụng chuỗi dựa trên Chất nền tùy chỉnh và chúng tôi cung cấp các công cụ để tự động nhập các loại, giao diện và các phương pháp bổ sung bằng cách sử dụng [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

Trong các phần sau, chúng tôi sử dụng [ví dụ về kitty](https://github.com/subquery/subql-examples/tree/main/kitty) để giải thích quá trình tích hợp.

### Sự chuẩn bị

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Follow the steps in [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) to retrieve a node's metadata from its **HTTP** endpoint.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
hoặc từ điểm cuối ** websocket ** của nó với sự trợ giúp từ [`websocat`](https://github.com/vi/websocat):

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/tutorials-kitty-chain), we have created `api-interface/kitty.json`.

#### Loại định nghĩa
Chúng tôi giả định rằng người dùng biết các loại cụ thể và hỗ trợ RPC từ chuỗi và nó được định nghĩa trong [Manifest](./manifest.md).

Sau khi thiết lập [types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), chúng tôi tạo:
- `src/api-interface/define.ts` - điều này xuất tất cả các định folder definitions

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interface/kitties/Definition.ts` - định nghĩa cho mô-đun kitties
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

#### Các gói

- In the `package.json` file, make sure to add `@polkadot/typegen` as a development dependency and `@polkadot/api` as a regular dependency (ideally the same version). We also need `ts-node` as a development dependency to help us run the scripts.
- Chúng tôi thêm các tập lệnh để chạy cả hai loại; `generate:defs` và siêu dữ liệu `generate:meta` (theo thứ tự đó, vì vậy siêu dữ liệu có thể sử dụng các loại).

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

### Gõ generation

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

Trong mỗi thư mục mô-đun (ví dụ: `/kitties`), bây giờ sẽ có `styles.ts` được tạo để xác định tất cả các giao diện từ định nghĩa của mô-đun này, cũng là một chỉ mục tệp `index.ts` xuất tất cả chúng.

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

### Sử dụng

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

**Nếu bạn muốn xuất bản dự án này cho người khám phá của chúng tôi, vui lòng đưa các tệp đã tạo vào `src/api-interface`.**

### Lệnh gọi rpc chuỗi tùy chỉnh

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
