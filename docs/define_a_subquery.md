# Define the SubQuery

## The Manifest

The Manifest `project.yaml` can be seen as an entry point of your project, it provides the following specifications in order to index and query a SubQuery.

The Manifest can be in either YAML or JSON format. 

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
    mapping:
      handlers:
        - handler: handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
````


- `specVersion` indicating which version of this API is being used. 

- `schema` pointing to the GraphQL schema of this SubQuery.

- The `network.endpoint` defined the endpoint of the blockchain to be indexed. 
- We support the additional types used by substrate runtime modules. 
The `network.types` declare the specific types supported by this blockchain, also `typesAlias`,`typesBundle`,`typesChain` and `typesSpec` are supported.

- The dataSources defines the data will be extracted and the logic of data transformation to be applied. 
  - For `dataSources.kind`, we are only supporting `substrate/Runtime` at the moment.
  - The `startBlock` specify the block height to start indexing from.
  - In `mapping.handlers` will list all the [mapping functions](#mapping-function) and their corresponding handler types,
  also [filters](#apply-filter).
  
  
### Apply filter


In above, you may have noticed we are supporting the optional filter feature. 
The applied filtering decide which block/event/extrinsic will trigger the mapping. 
Incoming data does not meet the requirement will not be processed further; this implementation will significantly reduce the mapping function side's workload.
```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
````
Following table explain filters supported by different handlers.

| Handler                  | Supported filter                                          |
|---------------------------|----------------------------------------------------|
| [BlockHandler](#blockhandler) | `specVersion` |
| [EventHandler](#eventhandler) | `module`,`method` |
| [CallHandler](#callhandler) | `module`,`method` ,`success`|

-  Module and method filter are supported to any substrate based chain.

- The `success` filter takes a boolean value, and can use to filtering the extrinsic by its success status.

- The `specVersion` filter specifies the spec version range for substrate block.
Following example describe how to set version ranges.
```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24.
# specVersion: [100]      #Index block with specVersion greater than or equal 100.
# specVersion: [null, 23] #Index block with specVersion less than or equal 23.
````

## The GraphQL Schema

### Defining Entities
It is must define the GraphQL schemas inside of `schema.graphql` file. To know how to write in  "GraphQL schema language",
we recommend checking out on [Schemas and Types](https://graphql.org/learn/schema/#type-language).


### Optional and required fields
Each entity must define its required field `id` with the type of `ID!`, it used as the primary key and unique among all entities of the same type.

**Required filed** in the entity are indicated by the `!`. 

Please see the example below:

```graphql
type Example @entity {
  id: ID! #id Entity is always required
  name: String! # This is a required field
  address: String #This is an optional field
}
```

### Supported scalars and types

We currently supporting flowing scalars:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Date`
- `Boolean`

For nested relationship entities, you might use the defined entity's name as one of the fields. Please see in [Entity Relationships](#entity-relationships).

### Entity Relationships

An entity often has nested relationships with other entities. Set the field value to another entity name will define a unidirectional relationship between these two entities by default.

From the entity's relationship perspectives, the entity can `belongsTo`,`hasOne`or`hasMany` with other entities. In following examples covers these scenarios.

#### One-to-One relationships

Define a Passport entity type with a required one-to-one relationship with a Person entity type:

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

#### One-to-Many relationships

Define a Contact entity type with an optional one-to-many relationship with a Person entity type.
And remember, use bracket to indicate a field type is multiple entities.

```graphql
type Person @entity {
  id: ID!
  contacts: [Contact] 
}

type Contact @entity {
  id: ID!
  phone: String!
}
```

#### Many-to-Many relationships

Many-to-Many relationships can be implement by pointing to the same entity name in multiple fields of another entity.

For example, an account can have multiple transfers, and a transfer is also belongs to the account it transferred from and to.
This will establish a bidirectional relationship between two Accounts (from and to) through Transfer table. 
```graphql
type Account @entity {
  id: ID!
}

type Transfer @entity {
  id: ID!
  amount: BigInt
  from: Account!
  to: Account!
}
```

#### Reverse Lookups

To enable reverse lookups on an entity, attach `@derivedFrom` to the field and point to its reverse lookup field of another entity.
This crate a virtual field on the entity that will be queried.

The Transfer from an account accessible from the Account by deriving a transfers field:
```graphql
type Account @entity {
  id: ID!
  transfers: [Transfer] @derivedFrom(field: "from")
}

type Transfer @entity {
  id: ID!
  amount: BigInt
  from: Account!
}
```

## Mapping function

The mappings function defined how to transform the indexed data into the entities have defined in the schema above. Mappings are written 
in a subset of TypeScript called AssemblyScript which can be compiled to WASM (WebAssembly). 

- In the [examples](/define_a_subquery.html#examples) and its `project.yaml` under mapping.handlers, create an exported function of the same name. 

- Also, under the `src/index.ts`, you have to export the functions of handlers as defined in above.

According to the different input parameters, they can be classified into three types, namely [Blockhandler](#blockhandler), [EventHandler](#eventhandler) and [CallHandler](#callhandler).

### BlockHandler
Each time a new block is attached to the Substrate chain, it is likely we want to capture some useful information, e.g. block number.
To achieve this this, a defined BlockHandler will be called once for every block.
``` ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    //Create a new starterEntity with ID using block hash
    let record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

#### SubstrateBlock

A [SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) is an extend interface type of [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/),
but also record the `specVersion` and `timestamp` from a block.

### EventHandler
The events that are part of the default Substrate runtime and a block may contain multiple events.
During the processing, the event handler will receive a substrate event as an argument with the event's typed inputs and outputs. Any type of events will trigger the mapping, allowing activity with the data source to be captured.
``` ts
import {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    //Retrieve the record by its ID
    const record = await starterEntity.get(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
````

#### SubstrateEvent

A [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) is an extend interface type of the [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149).
Besides the event data, it is now also attached with an id, the block to which this event belongs, and the extrinsic inside of this block.

### CallHandler
The CallHandler is an exported function in the mapping script that should handle the specified substrate extrinsic.
``` ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = await starterEntity.get(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

#### SubstrateExtrinsic
The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) assigned with an id, it provide an extrinsic property which extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170), the block to which this extrinsic belongs, and the events among this block.
Last, it records the success status of this extrinsic.


### Query States
We wish to cover all data sources for the user in the mapping handler, other than the three configured interface types above. Therefore, we have exposed some of the @polkadot/api interfaces to increase the scalability. 
These are the interface we supporting now:

- [api.query.module.method()](https://polkadot.js.org/docs/api/start/api.query) will query the <strong>current</strong> block.

- [api.query.module.method.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) will multi queries of the <strong>same</strong> types at the current block.

- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) will multi queries of the <strong>different</strong> types at the current block.

See an example of using the API in [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold).


### Examples

| Example                   | Description                                          | Keywords     |
|---------------------------|------------------------------------------------------|--------------|
| [extrinsic-finalized-block](https://github.com/subquery/subql-examples/tree/main/extrinsic-finalized-block) | Index extrinsics and so they can be queried by hash. | blockHandler |
| [block-timestamp](https://github.com/subquery/subql-examples/tree/main/block-timestamp) | Indexes timestamp of each finalized block. | callHandler |
| [sum-reward](https://github.com/subquery/subql-examples/tree/main/sum-reward) | Indexes staking bond, reward and slash from events of finalized block. | eventHandler |
| [kitty](https://github.com/subquery/subql-examples/tree/main/kitty) | Indexes birthinfo of kitties. | callHandler, eventHandler, customTypes |
| [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) | Indexes the least staking amount required for a validator to be elected. | blockHandler, @polkadot/api |
| [entity-relation](https://github.com/subquery/subql-examples/tree/main/entity-relation) | Indexes balance transfers between accounts, also indexes utility batchAll to find out the content of the extrinsic calls | One-to-many, many-to-many relationship |


## Code Generation

```
yarn codegen
```
- This will create a new directory `src/types` which contains all generated entities in typescript.

- Generated entity class for each type you have defined previously in `schema.graphql`. These classes provide type-safe 
entity loading, read and write access to entity fields.

## Build 

````
yarn build
````
Run build command will compile the project. 

## Pack
````
yarn pack
````
Run pack command will compile and pack the project. 
