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

请注意这是一个 **实验性功能** ，您可能遇到可能对您的映射功能产生不利影响的bug或问题。 如果您发现了任何bug, 请在 [GitHub](https://github.com/subquery/subql) 中创建一个issue来报告给我们。

### Built-in modules

目前，我们允许下列NodeJS 模块： `assert`, `buffer`, `crypto`, `util`, and `path`.

相比导入整个模块，我们建议只导入您需要的方法。 这些模块中的某些方法可能有依赖关系, 如果想导入不受支持的模块将会导致导入失败。

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

由于虚拟机在我们的沙盒中的局限性，我们目前只支持由 **CommonJS** 编写的第三方库。

我们还支持一个 ** hybrid ** 库，如默认使用ESM`@polkadot/*` 。 然而，如果任何第三方库依赖于 **ESM** 格式的任何模块，虚拟机将**不会** 编译并返回错误。

## Custom Substrate Chains

SubQuery 可以用于任何基于 Substrate 的链，而不仅仅是 Polkadot 或 Kusama。

您可以使用基于自定义的 Substrate 链，我们通过使用[@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/)来自动导入类型、接口和其他方法。

在以下章节中，我们使用我们的 [kitty 示例](https://github.com/subquery/tutorials-kitty-chain) 来解释集成过程。

### 准备

在项目 `src` 文件夹下创建一个新的目录 `api-interface` 来存储所有需要和生成的文件。 我们还创建了一个 `api-interface/kites` 目录，因为我们想要从 `kites` 模块中为API 添加装饰方法。

#### 元数据

我们需要元数据才能生成实际的 API 端点。 在kitty的例子中，我们使用本地测试网的端点，并提供额外的类型。 按照 [PolkadotJS 元数据设置](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) 的步骤从 **HTTP** 端点追溯节点的元数据。

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
或者也可以使用 **websocket**, 请查看[`websocat`](https://github.com/vi/websocat)文档。

```shell
//安装 websocat
brew install websocat

//获取元数据
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

接下来，复制输出并粘贴到一个 JSON 文件。 在我们的 [kitty 示例](https://github.com/subquery/tutorials-kitty-chain)，我们创建了 `api-interface/kitty.json`。

#### 类型定义
我们假定用户知道该链中的特定类型和RPC支持，它是在 [ Manifest ](./manifest.md) 中定义的。

按照 [类型设置](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), 我们首先创建:
- `src/api-interfaces/definitions.ts` - 这将导出所有子文件夹中的定义

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - kitty模块的类型定义
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

#### 包

- 在 `package.json` 中， 请务必添加 `@polkadot/typegen` 作为一个拓展依赖关系和 `@polkadot/api` 作为普通依赖关系(最好是相同的版本)。 我们还需要 `ts-node` 作为一种拓展依赖来帮助我们运行脚本。
- 我们添加脚本来运行这两种类型； `generate:defs` 和元数据 `generate:meta` 生成器(按此顺序，元数据可以使用这些类型)。

这里是 `package.json` 的简单示例。 请在 **scripts** 部分中，确认包名是正确的，目录是有效的。

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

### 类型生成

现在已经完成了准备工作，我们可以生成类型和元数据。 运行下面的命令：

```shell
# 使用Yarn来安装新的依赖
yarn
```

在每个模块文件夹(比如 `/kitties`), 现在应该有一个生成的 `types.ts`, 其中定义了此模块定义中的所有接口，同时还有一个文件 `index.ts` ，可以用来导出所有接口。

```shell
# 生成元数据
yarn generate:meta
```

这个命令将为 API 生成元数据和一个新的 api-augment。 由于我们不想使用内置的 API，我们需要在我们的 `tsconfig.json`中添加一个明确的重载来替换它们。 更新后，配置中的路径将看起来像这样(没有注释)：

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

### 使用

现在，在映射函数中，我们可以演示元数据和类型如何实际装饰API。 RPC 端点将支持我们在上面声明的模块和方法。 若要使用自定义的 rpc 调用，请查看 [Custom chain rpc calls](#custom-chain-rpc-calls)章节。
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

**如果您想要将此项目发布给我们的探索者，请把生成的文件放在 `src/api-interface` 中。**

### 自定义链的 rpc 调用

为了支持自定义链的RPC调用，我们必须为允许per-spec 配置的`typesBundle`手动注入RPC 定义。 你可以在 `project.yml`中定义 `typesBundle`。 并且请记住我们只支持 ` isHistoric ` 类型的调用。
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
