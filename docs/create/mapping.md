# Mapping

Mappings functions define how chain data is transformed in to the optimised GraphQL entities that we have previously defined in teh `schema.graphql` file.

Mappings are written in a subset of TypeScript called AssemblyScript which can be compiled to WASM (WebAssembly). 
- Mappings are defined in the `src/mappings` directory and are exported as a function
- These mappings are also exported in `src/index.ts`
- The mappings files are reference in `project.yaml` under the mapping handlers.

There are three classes of mappings functions; [Block handlers](#block-handler), [Event Handlers](#event-handler) and [Call Handlers](#call-handler).

## Block Handler

You can use block handlers to capture information each time a new block is attached to the Substrate chain, e.g. block number. To achieve this this, a defined BlockHandler will be called once for every block.

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

## Event Handler

You can use event handlers to capture infomration when certain events are included on a new block. The events that are part of the default Substrate runtime and a block may contain multiple events.

During the processing, the event handler will receive a substrate event as an argument with the event's typed inputs and outputs. Any type of events will trigger the mapping, allowing activity with the data source to be captured. You should use [Mapping Filters](/create/manifest.html#mapping-filters) in your manifest to filter events to reduce the time it takes to index data and improve mapping performance.

```ts
import {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Retrieve the record by its ID
    const record = await starterEntity.get(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
```

A [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) is an extended interface type of the [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Besides the event data, it is also includes an id (the block to which this event belongs) and the extrinsic inside of this block.

## Call Handler

Call handlers are used when you want to capture information on certain substrate extrinsics.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = await starterEntity.get(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). It is assigned an id (the block to which this extrinsic belongs) and provide an extrinsic property which extends the events among this block. Additionally it records the success status of this extrinsic.

## Query States
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Therefore, we have exposed some of the @polkadot/api interfaces to increase the scalability. 

These are the interface we support now:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) will query the <strong>current</strong> block.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) will make multiple queries of the <strong>same</strong> type at the current block.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) will make multiple queries of <strong>different</strong> types at the current block.

And these are the interface we do **NOT** support currently:
- ~~api.tx.*~~
- ~~api.rpc.*~~
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

## Built-in modules and third-party library

In order to facilitate users to process data, we have allowed some of the nodejs built-in modules for running mapping functions in the [sandbox](#the-sandbox) , and allowed users to call third-party library.
Please note this is an **experimental features** ,there is a slight chance they may bug out and negatively impact on your mapping functions.
### Built-in modules 

Currently, we allowed: `assert`, `buffer`, `crypto`, `util`, `path` . 

Rather than importing the complete module, we recommend only import the demanding methods as you needed. Because some methods might have dependencies with other modules we disallowed, which will cause failure when implementation. 

```ts
import {createHash} from "crypto"; //Good way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = await starterEntity.get(extrinsic.block.block.header.hash.toString());
    record.field1 = createHash('sha256');
    await record.save();
}
```

### Third-party library

Due to the limitations of the virtual machine in our sandbox, currently we only support third-party libraries written by **CommonJS**. 

If a library is depends on any modules in **ESM** format, the virtual machine will not be able to compile and return the outcome. 

 
