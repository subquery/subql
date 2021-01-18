# Define the SubQuery

## The Manifest

The `project.yaml` is an entry point of your project. It defined the endpoint of the blockchain to be indexed.
  `dataSources.kind` defines the type of datasources. In `mapping.handlers` will list all the [mapping functions](#mapping-function) and their corresponding handler types,
  also [filters](#apply-filter).


## The GraphQL Schema

It is must define the GraphQL schemas inside of `schema.graphql` file. To know how to write in  "GraphQL schema language",
we recommend to check out on [Schemas and Types](https://graphql.org/learn/schema/#type-language).

We currently supporting flowing types:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Date`


## Mapping function

The mappings function defined how to transform the indexed data into the entities have defined in the schema above. Mappings are written 
in a subset of TypeScript called AssemblyScript which can be compiled to WASM (WebAssembly). 

- We also provided a few examples of a mapping function in `src/mappings/mappingHandlers.ts`. For each handler that is defined in `project.yaml`
under mapping.handlers, create an exported function of the same name. 

- Also, under the `src/index.ts`, you have to export the functions of handlers as defined in above.

According to the different input parameters, they can be classified into three types, namely [Blockhandler](#blockhandler), [EventHandler](#eventhandler) and [CallHandler](#callhandler).

### BlockHandler
Each time a new block is attached to the Substrate chain, it is likely we want to capture some useful information, e.g. block number.
To achieve this this, a defined BlockHandler will be called once for every block.
``` ts
export async function handleBlock(block: SignedBlock): Promise<void> {
    //Create a new starterEntity with ID using block hash
    let record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```
### EventHandler
The events that are part of the default Substrate runtime and a block may contain multiple events.
To process these events, the event handler will receive an substrate event as an argument with the typed inputs 
to and outputs from the event. Any type of events will trigger the mapping, allowing activity with the data source to be captured.
``` ts
export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    //Retrieve the record by its ID
    const record = await starterEntity.get(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
````

### CallHandler

``` ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = await starterEntity.get(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}

```

### Apply filter

In the `project.yml`, you may have noticed we are supporting filter feature for `EventHandler` and `Call Handlers.`
Applying the filter means any extrinsic/event that does not match the required module and section will not be processed further. Doing this will significantly reduce the workload from the mapping function side. 

Also, using the filter is an option, but here is an example in your manifest:

```yaml
filter: 
   module: balances
   method: Deposit
````
To find out module and method are supported, check out [Extrinsics](https://polkadot.js.org/docs/substrate/extrinsics) for CallHandler, 
and [Events](https://polkadot.js.org/docs/substrate/events) for EventHandler.

## Code Generation

```
$yarn codegen
```
- This will create a new directory `src/types` which contains all generated entities in AssemblyScript.
- Generated entity class for each type you have defined previously in `schema.graphql`. These classes provide type-safe 
entity loading, read and write access to entity fields.

