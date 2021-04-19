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
    filter:  #Optional
      specName: kitty-chain 
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
  - The `dataSources.filter` will filtering the data source to execute by the network endpoint spec name, see [network filter](#network-filter )
  - In `mapping.handlers` will list all the [mapping functions](#mapping-function) and their corresponding handler types,
  also [filters](#mapping-filter).


### Network filter  

Commonly, the user will create a subquery and expect to (re)use it for their testnet and mainnet (e.g Polkadot and Kusama), and for the different network, their start indexing block is likely to vary. Therefore, it's helpful to provide this optional feature when the user wishes to run a different datasource for a different network.

To switch between the network endpoints and decide which data sources to run on the current network, add a network filter on the `dataSources` will make this simpler.
Here is another way to define the manifest. It will only execute the data source `polkadotRuntime` because its spec name in the filter is matching with the default network endpoint.

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Create a template to avoid redundancy
definitions:
  - mapping: &mymapping
       handlers:
         - handler: handleBlock
           kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter:  #Optional
        specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping #reuse template
```




  
### Mapping filter

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
-  For nested relationship entities, you might use the defined entity's name as one of the fields. Please see in [Entity Relationships](#entity-relationships).
- `JSON` type to store structured data, please see [JSON type](#json-type)


### JSON type

We are supporting the JSON type, but we also recommend users to follow these guidelines:

- When storing structured data in a single field is more manageable than creating multiple separate tables and columns.
- Saving arbitrary key/value user preferences (where the value can be boolean, textual, or numeric, and you don't want to have separate columns for different data types)
- The schema is designed to be volatile

#### Define JSON directive
Define the object as a JSON directive by adding the `jsonField` annotation in the schema, this will automatically generate interfaces for all JSON objects in your project under `types/interfaces.ts`, and you can access them in your mapping function.

Unlike the entity, the jsonField directive object does not require any `id` field. 
A JSON object is also able to nest with other JSON objects.

````graphql

type AddressDetail @jsonField {
  street: String!
  district: String!
}

type ContactCard @jsonField {
  phone: String!
  address: AddressDetail #nesting json
}

type User @entity {
  id: ID! 
  contact: [ContactCard] #Store a list of Json objects
}

````

#### Query JSON field

The drawback of adopting JSON type is it will affect query efficiency when filtering since each time it performs a text search on the context.
However, it is still acceptable in our query service. Here is an example of how to use the `contains` operator in the filter for JSON field.
```graphql

#To find the the first 5 users own phone numbers contains '0064'.

query{
  user(first: 5, filter: {
    contactCard: {
       contains: [{phone:"0064"}]
    }
}){
    nodes{
      id
      contactCard
    }
  }
}

```
                                   


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
A many-to-Many relationship can be achieved by implementing a middle entity to connect the other two entities.

Also, it is possible to create a connection of the same entity in multiple fields of the middle entity.
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

- In the [examples](#examples) and its `project.yaml` under mapping.handlers, create an exported function of the same name. 

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


### Indexing by Non-Key field

In the mapping function, it is easy to acquire the entity by its key. However, accessing the entity having the field with a particular value is difficult. 
That is why we support indexing on entity fields simply by implement the `@index` annotation on the **Non-Key**(exclude primary and foreign keys) field.
Here is an example.

```graphql

type User @entity {
  id: ID!
  name: String! @index(unique: true)
  title: String! @index
}

```
```sql
# Add a record
INSERT INTO SCHEMA_1.users(id,name,title) VALUES ('10086','Jack Sparrow','Pirate Lord');
```
Assume we knew this user's name, but we don't know the exact id value, rather than extract all users and then filtering by name.
The more accessible and effective approach is adding `@index` behind the name field, and we can pass the `unique: true` to make sure its uniqueness. 

When code generation, this will automatically create a `getByName` under the `User` model, which can directly be accessed in the mapping function.

```typescript
// UserHandler in mapping function
import {User} from "../types/models/User"

const jack = User.getByName('Jack Sparrow');

const pirateLords = User.getByTitle('Pirate Lord'); //list of all pirate lords
```


### Query States
We wish to cover all data sources for the user in the mapping handler, other than the three configured interface types above. Therefore, we have exposed some of the @polkadot/api interfaces to increase the scalability. 
These are the interface we supporting now:

- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) will query the <strong>current</strong> block.

- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) will multi queries of the <strong>same</strong> types at the current block.

- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) will multi queries of the <strong>different</strong> types at the current block.

And these are the interface we are **NOT** supporting at the moment:

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

See an example of using the API in [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold).

### Logging

We injected a `logger` module in the types, which means rather than use the `console` , we support a logger that can accept various logging levels.

```typescript
logger.info("Info level message")
logger.debug("Debugger level message")
logger.warn("Warning level message")
```
In addition, viewing the debug messages requires adding `--log-level debug` in your command line.


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
