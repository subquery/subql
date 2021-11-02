# Manifest File

The Manifest `project.yaml` file can be seen as an entry point of your project and it defines most of the details on how SubQuery will index and transform the chain data.

The Manifest can be in either YAML or JSON format. In this document, we will use YAML in all the examples. Below is a standard example of a basic `project.yaml`. 

<CodeGroup>
  <CodeGroupItem title="v0.2.0" active>
``` yml
specVersion: 0.2.0
name: example-project  #Provide the project name
version: 1.0.0  #Project version
description: ''
repository: 'https://github.com/subquery/subql-starter'
schema:
  file: ./schema.graphql  
network:
  genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' #Genesis hash of the network
  endpoint: 'wss://polkadot.api.onfinality.io/public-ws'
  dictionary: 'https://api.subquery.network/sq/subquery/dictionary-polkadot'
dataSources:
  - kind: substrate/Runtime
    startBlock: 1
    mapping:
      file: dist/index.js #Entry path for this mapping
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter:
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```
  </CodeGroupItem>

  <CodeGroupItem title="v0.0.1">
``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing
  dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter is optional but suggested to speed up event processing
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```
  </CodeGroupItem>
</CodeGroup>

## Overview

### Main things to note when migrating from v0.0.1 to v0.2.0 project.yaml

#### Under `network`
  
  - There is a new **required** genesisHash field which helps to identify the chain being used.

  - For v0.2.0 and above, you will need to link seperate [chaintype file](#custom-chains) if using.

#### Under `dataSources`

  - Can directly link index.js entry point for mapping handlers. This index.js will be generated from index.ts after yarn run build.

  - For data sources can now add either a regular runtime data source or [custom data source](#custom-data-sources).

<br />

**If you have a project with specVersion v0.0.1, you can use `subql migrate` to quickly upgrade. [See here](#cli-options) for more information**


### Top Level Spec
| Field           |  v0.0.1                            | v0.2.0                             |   Description |
| --------------- |:--------------------------------:  |:---------------------------------: | -------------:|
| **specVersion** | String                             | String                             | `0.0.1` or `0.2.0`, the spec version of the manifest file |
| **name**        | 𐄂                                  | String                             | Name of the project|
| **version**     | 𐄂                                  | String                             | Version of the project|
| **description** | String                             | String                             | Discription of the project|
| **repository**  | String                             | String                             | Repository of the project|
| **schema**      | String                             | [Schema Spec](#schema-spec)        | Schema file   |
| **network**     | [Network Spec](#network-spec)      | Network Spec                       | Detail of the network to be indexed|
| **dataSources** | [DataSource Spec](#datasource-spec)| DataSource Spec                    |               |


### Schema Spec
| Field           | Type           | v0.0.1         | v0.2.0        |  Description  |
| --------------- |:--------------:|:-------------: |:-------------:| -------------:|
| **file**        | String         | 𐄂              |               | Entry path to `schema.graphql` |


### Network Spec
| Field                    | v0.0.1         |v0.2.0        |  Description  |
| ------------------------ |:--------------:|:-----------: |:-------------:|
| **genesisHash**         |                |              | The genesis hash of the network |
| **endpoint**             | String         | String       | Defines the wss or ws endpoint of the blockchain to be indexed - **This must be a full archive node**.|
| **dictionary**           | String         | String       | Optionally provides the HTTP endpoint of a full chain dictionary to speed up processing - read [how a SubQuery Dictionary works](../tutorials_examples/dictionary.md).|
| **chaintypes**           | 𐄂              | {file:String}| Path to chain types file, accept `.json` or `.yaml` format|


### Datasource Spec
Defines the data that will be filtered and extracted and the location of the mapping function handler for the data transformation to be applied. 
| Field           | v0.0.1         | v0.2.0        | Description
| --------------- |:--------------:|:-------------:|:-------------:|
| **name**        | String         | 𐄂             | Name of the data source |
| **kind**        | [substrate/Runtime](./manifest/#data-sources) | substrate/Runtime, [substrate/CustomDataSource](./manifest/#custom-data-sources)| We supports data type from default substrate runtime such as block, event and extrinsic(call). <br /> From v0.2.0, we support data from custom runtime, such as smart contract.|
| **startBlock**  | Integer | Integer | Specifies the block height to start indexing from.|        
| **mapping**     | Mapping Spec| Mapping Spec |  |
| **filter**      | [network-filters](./manifest/#network-filters)| 𐄂  | Filter the data source to execute by the network endpoint spec name |


### Mapping Spec
| Field           | v0.0.1         | v0.2.0        | Description
| --------------- |:--------------:|:-------------:|:-------------:|
| **file**        | String         | 𐄂             | Path to the mapping entry |
| **handlers & filters** | [Default handlers and filters](./manifest/#mapping-handlers-and-filters) | Default handlers and filters, <br />[Custom handlers and filters](#custom-data-sources)| List all the [mapping functions](./mapping.md) and their corresponding handler types, with additional mapping filters. <br /><br /> For custom runtimes mapping handlers please view under [Custom data sources](#custom-data-sources) | 

## Data Sources

In this section, we will talk about the default substrate runtime and its mapping, here is an example: 
```yaml
dataSources:
  - kind: substrate/Runtime  #Indicate this is default runtime
    startBlock: 1
    mapping:
      file: dist/index.js
...
```
### Mapping handlers and Filters

The following table explains filters supported by different handlers.

| Handler                   | Supported filter                                          |
|---------------------------|----------------------------------------------------|
| [BlockHandler](./mapping.md#block-handler) | `specVersion` |
| [EventHandler](./mapping.md#event-handler) | `module`,`method` |
| [CallHandler](./mapping.md#call-handler) | `module`,`method` ,`success`|


Default runtime mapping filters are an extremely useful feature to decide what block, event, or extrinsic will trigger a mapping handler. 

Only incoming data that satisfy the filter conditions will be processed by the mapping functions. Mapping filters are optional but are recommended as they significantly reduce the amount of data processed by your SubQuery project and will improve indexing performance.

```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

-  Module and method filters are supported on any substrate-based chain.
- The `success` filter takes a boolean value and can be used to filter the extrinsic by its success status.
- The `specVersion` filter specifies the spec version range for a substrate block. The following examples describe how to set version ranges.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```


## Custom Chains

You can index data from custom chains by also including chain types in the manifest. 

We support the additional types used by substrate runtime modules, `typesAlias`, `typesBundle`, `typesChain`, and `typesSpec` are also supported.

In the example of v0.2.0 below, the `network.chaintypes` are pointing to a file that saved all custom types, which declare the specific types supported by this blockchain. And this file can be either in `.json` or `.yaml` format.

<CodeGroup>
  <CodeGroupItem title="v0.2.0" active>
``` yml
network:
  genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
  endpoint: 'ws://host.kittychain.io/public-ws'
  chaintypes:
    file: ./types.json # Where custom types stored
...
```
  </CodeGroupItem>

  <CodeGroupItem title="v0.0.1">
``` yml
...
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
  </CodeGroupItem>
</CodeGroup>


## Custom Data Sources

Custom Data Sources provide network specific functionality that makes dealing with data easier. They act as a middleware that can provide extra filtering and data transformation.

A good example of this is EVM support, having a custom data source processor for EVM means that you can filter at the EVM level (e.g. filter contract methods or logs) and data is transformed into structures farmiliar to the Ethereum ecosystem as well as parsing parameters with ABIs.

Custom Data Sources can be used with normal data sources.

Here is a list of supported custom datasources:


| Kind            | Supported Handlers | Filters        | Description   |
| --------------- |:------------------:|:--------------:|:-------------:|
| [substrate/Moonbeam](../datasources/moonbeam/#data-source-example)| [substrate/MoonbeamEvent](../datasources/moonbeam/#moonbeamevent), [substrate/MoonbeamCall](../datasources/moonbeam/#moonbeamcall) | See filters under each handlers | Provides easy interaction with EVM transactions and events on Moonbeams networks |

## CLI Options

`subql init --specVersion 0.2.0 <projectName>`

  - For now to initialise a project with v0.2.0 project.yaml this flag must be used.

`subql migrate`

  - You can run this from your project root to upgrade old subquery project's project.yaml.


| Options | Description |
|:-----:|:-----------:|
| -f,  --force| |
| -l, --location | local folder to run migrate in (must contain project.yaml) |
| --file=file | to specify the project.yaml to migrate |

## Network Filters 

**Network filters only applies to manifest spec v0.0.1**. 

Usually the user will create a SubQuery and expect to reuse it for both their testnet and mainnet environments (e.g Polkadot and Kusama). Between networks, various options are likely to be different (e.g. index start block). Therefore, we allow users to define different details for each data source which means that one SubQuery project can still be used across multiple networks.

Users can add a `filter` on `dataSources` to decide which data source to run on each network.

Below is an example that shows different data sources for both the Polkadot and Kusama networks.


<CodeGroup>
  <CodeGroupItem title="v0.0.1">

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Create a template to avoid redundancy
definitions:
  mapping: &mymapping
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
    mapping: *mymapping # can reuse or change
```

  </CodeGroupItem>

</CodeGroup>

