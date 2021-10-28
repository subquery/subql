# Mapping

映射函数定义了如何将链数据转换为我们先前在`schema.GraphQL`文件中定义的优化GraphQL的具体解决办法。

- 映射在`src/Mappings`目录中定义，并作为函数导出
- 这些映射也可以在`src/index.ts中导出</li>
<li>映射文件在映射处理程序下的<code>project.yaml`中引用。

共有三类映射函数的: [Block handlers](#block-handler)，[Event Handlers](#event-handler)和[Call Handlers](#call-handler)。

## Block Handler

当一个新的区块底层链产生时，您可以使用区块处理程序来获取信息，例如，区块号。 为了实现这一点，将为每个区块调用一次已定义的BlockHandler。

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16)是[signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/)的扩展接口类型，同样包括`specVersion`和`timestamp`。

## Event Handler

在某些事件写入一个新的区块上时，您可以使用事件处理程序来捕获信息。 一部分事件是默认的 Substrate 运行时间, 一个区块可能会包括多个事件。

在处理过程中，事件处理程序将收到一个底层事件作为事件类型的输入和输出的参数。 任何类型的事件都会触发映射，从而允许捕捉到包含数据的活动。 您应该在程序清单中使用 [Mapping Filters](./manifest.md#mapping-filters) 来过滤事件，以缩短为数据建立索引的时间和改进映射性能。

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

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) 是 [ EventRecord ](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149) 的扩展接口类型。 除了事件数据外，它还包括一个 `id` (该事件所属的区块) 以及此区块的外部地址。

## Call Handler

当您想要捕获某些底层外部的信息时，可以使用 Call handlers。

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) 继承了 [ GenericExtrinsic ](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). 它被分配了一个 `id` (该外包属于的方块)，并提供了扩展此方块中的事件的外在属性。 此外，它还记录了这个外包的成功状态。

## Query States
我们的目标是通过映射处理函数为用户提供所有数据源(不仅仅是上述三种接口事件类型)。 因此，我们开放了一些@polkadot/api的接口来丰富能力。

这些是我们当前支持的接口：
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query)  将查询 <strong>当前</strong> 区块。
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) 将在当前块上进行多个 <strong>相同</strong> 类型的查询。
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) 将在当前块进行<strong>不同</strong>类型的多个查询。

这些是我们 **当前不支持** 的接口：
- ~~~api.tx.*~~
- ~~api.derive.*~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.at~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.range~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.sizeAt~~

请看我们在 [alidator-threshold](https://github.com/subquery/tutorials-validator-threshold) 实例中使用此 API 的例子。

## RPC calls

我们还支持一些API RPC方法，这些方法是允许映射函数能够与实际节点、查询和提交进行交互的远程调用。 SubQuery的一个核心前提是，它具有确定性，因此为了保证结果一致我们只允许已经发生的RPC调用。

[JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) 中的文档提供了一些方法, 以 `BlockHash` 作为输入参数 (比如,  `at?: BlockHash`), 现在是被允许。 我们还修改了这些方法以默认使用当前索引区块哈希。

```typescript
// 比如，我们正在用这个哈希值找到区块索引
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d0681148e9d41ef086f6a`;

// 原始方法的可选输入是区块哈希
const b1 = await api.pc.chain.getBlock(blockhash)；

// 如果默认是当前方块我们就可以这么使用
const b2 = await api.rpc.chain.getBlock();
```
- 对于 [自定义 Substrate 链](#custom-substrate-chains) 的RPC 调用，请参阅 [使用方法](#usage)。

## Modules and Libraries

为了提高SubQuery的数据处理能力, 我们已经允许NodeJS 的一些内置模块在 [沙盒](#the-sandbox)中运行映射函, 并且允许用户调用第三方库。

请注意这是一个 **实验性功能** ，您可能遇到可能对您的映射功能产生不利影响的bug或问题。 Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

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

In the following sections, we use our [kitty example](https://github.com/subquery/tutorials-kitty-chain) to explain the integration process.

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

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/tutorials-kitty-chain), we have created `api-interface/kitty.json`.

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
```

#### Packages

- In the `package.json` file, make sure to add `@polkadot/typegen` as a development dependency and `@polkadot/api` as a regular dependency (ideally the same version). We also need `ts-node` as a development dependency to help us run the scripts. We also need `ts-node` as a development dependency to help us run the scripts.
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

```
