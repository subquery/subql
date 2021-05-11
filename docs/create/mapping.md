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

## Modules and Libraries

In order to improve SubQuery's data processing capabilities, we have allowed some of the NodeJS's built-in modules for running mapping functions in the [sandbox](#the-sandbox), and have allowed users to call third-party libraries.

Please note this is an **experimental features** and you may encounter bugs or issues that many negatively impact on your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).
### Built-in modules 

Currently, we allow the following NodeJS modules: `assert`, `buffer`, `crypto`, `util`, and `path` . 

Rather than importing the whole module, we recommend only importing the required method(s) that you need. Some methods in these modules may have dependencies that are unsupported and will fail on import. 

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = await starterEntity.get(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### Third-party libraries

Due to the limitations of the virtual machine in our sandbox, currently we only support third-party libraries written by **CommonJS**. 

If a library is depends on any modules in **ESM** format, the virtual machine will **NOT** compile and return the outcome. 

 
## Specific substrate chain

The custom types/interfaces from a specific substrate chain (other than polkadot/kusam) are usually difficult for the user to import and implement. And standard API injected from the sandbox is not support query or RPC call on specific module/method.

However, the [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/) is the right tool to help us generate specific interfaces and decorate additional methods in the API.

Take a look at the example given in [kitty](https://github.com/subquery/subql-examples/tree/main/kitty). The instructions below will explain the integration process.

### Preparation

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files.
We also create an `api-interfaces/kitties` directory as we want to add decoration in API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API augmented endpoints. In the kitty example, we use an endpoint from a local test net, and it provides additional types.
Follow the step in [Metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), to retrieve metadata from a node from its **HTTP** 

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```

or from a **Websocket** by use `websocat`:

```shell
//Install the websocat
brew install websocat

//Get metadata
websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Then copy and paste the output to a JSON file. In the example, we have stored it in the `api-interface/kitty.json`.

#### Type definitions
In our assumption, the user should know the specific types and RPC from the chain, and it is defined in the [Manifest](/create/manifest.html). 
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
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isHistoric: "bool",
                    isOptional: "bool"
                }
            ],
            type: 'Balance'
        }
    }
}
```

#### Packages

- Make sure in the `package.json` development dependencies we have to add the `@polkadot/typegen`, we need to use this generate type definitions that can be used to decorate the `@polkadot/api`, ideally these two packages should have identical version. We also need the `ts-node` in development dependencies to help us run the scripts.

- We add scripts to run both types and meta generators (in that order, so metadata can use the types).

Here is a simplified version of `package.json`. Make sure in the **scripts** section the package name is correct and directories are validated.

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

Now the preparation is completed, we are ready to generate types and meta. Run the command below step by step:

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

In each modules folder (eg `/kitties`), there should a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` export all of them.

Then run:

```shell

# Generate meta
yarn generate:meta

```

This command will generate the meta and new api-augment for the APIs. As we don't want to use the built-in API, we need to replace them by add an explicit override in our `tsconfig.json`.
After updates, the paths in the config looks as follow (remove the comments)

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

Now in the mapping function, we can show how the metadata and types actually decorate the API.
The RPC should support the modules and its method we declared above.


```typescript
export async function kittyApiHandler(): Promise<void> {
    const nextKittyId = await api.query.kitties.nextKittyId();
    const allKitties  = await api.query.kitties.kitties('xxxxxxxxx',123)
    const kittyPrice = await api.rpc.kitties.getKittyPrice(nextKittyId);
    logger.info(`Next kitty id ${nextKittyId} and price is ${kittyPrice}`)
}
```

