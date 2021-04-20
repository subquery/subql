# Manifest File

The Manifest `project.yaml` can be seen as an entry point of your project, it defines most of the deetails on how SubQuery will index and transform chain data.

The Manifest can be in either YAML or JSON format - in this document we will use YAML in all examples. 

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
```

- `specVersion` indicates which version of this API is being used. 
- `schema` points to the GraphQL schema file of this SubQuery (you shouldn't need to change this).
- `network.endpoint` defines the wss or ws endpoint of the blockchain to be indexed. 
- `network.types` declare the specific types supported by this blockchain. We support the additional types used by substrate runtime modules.
    - `typesAlias`, `typesBundle`, `typesChain`, and `typesSpec` are supported.
- `dataSources` defines the data will be filtered and extracted and the location of the mapping function handler for the data transformation to be applied. 
  - `kind` only supports `substrate/Runtime` for now.
  - `startBlock` specifies the block height to start indexing from.
  - `filter` will filter the data source to execute by the network endpoint spec name, see [network filters](#network-filters)
  - `mapping.handlers` will list all the [mapping functions](/create/mapping) and their corresponding handler types,
  with additional [mapping filters](#mapping-filters).

## Network Filters 

Commonly, the user will create a SubQuery and expect to reuse it for both their testnet and mainnet (e.g Polkadot and Kusama). Between networks, various options are likely to vary (e.g. index start block). Therefore, we allow users to define different details for each data source so one SubQuery project can still be used across multiple networks.

Users can add a `filter` on `dataSources` to decide which data source to run on the each network.

Below is an example that shows different data sources for both Polkadot and Kusama networks.

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
    mapping: *polkadot-mapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *kusmama-mapping # can reuse or change
```
  
## Mapping Filters

Mapping filters are a extremely useful feature to decide what block, event, or extrinsic will trigger a mapping handler. 

Only incoming data that statisfy the filter conditions will be processed by mapping functions. Mapping filters are optional, but are recommended as they significantly reduce the amount of data processed by your SubQuery project and will improve indexing performance.

```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

Following table explain filters supported by different handlers.

| Handler                  | Supported filter                                          |
|---------------------------|----------------------------------------------------|
| [BlockHandler](/create/mapping.html#block-handler) | `specVersion` |
| [EventHandler](/create/mapping.html#event-handler) | `module`,`method` |
| [CallHandler](/create/mapping.html#call-handler) | `module`,`method` ,`success`|


-  Module and method filter are supported to any substrate based chain.
- The `success` filter takes a boolean value, and can use to filtering the extrinsic by its success status.
- The `specVersion` filter specifies the spec version range for substrate block. The following examples describe how to set version ranges.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```