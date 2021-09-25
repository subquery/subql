# Manifest File

The Manifest `project.yaml` file can be seen as an entry point of your project and it defines most of the details on how SubQuery will index and transform the chain data.

The Manifest can be in either YAML or JSON format. In this document, we will use YAML in all the examples. Below is a standard example of a basic `project.yaml`.

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

- `network.endpoint` defines the wss or ws endpoint of the blockchain to be indexed - **This must be a full archive node**.
- `network.dictionary` optionally provides the HTTP endpoint of a full chain dictionary to speed up processing - see [Running an Indexer](../run/run.md#using-a-dictionary)
- `dataSources` defines the data that will be filtered and extracted and the location of the mapping function handler for the data transformation to be applied.
  - `kind` only supports `substrate/Runtime` for now.
  - `startBlock` specifies the block height to start indexing from.
  - `filter` will filter the data source to execute by the network endpoint spec name, see [network filters](#network-filters)
  - `mapping.handlers` will list all the [mapping functions](./mapping.md) and their corresponding handler types, with additional [mapping filters](#mapping-filters).

## Network Filters

Usually the user will create a SubQuery and expect to reuse it for both their testnet and mainnet environments (e.g Polkadot and Kusama). Between networks, various options are likely to be different (e.g. index start block). Therefore, we allow users to define different details for each data source which means that one SubQuery project can still be used across multiple networks.

Users can add a `filter` on `dataSources` to decide which data source to run on each network.

Below is an example that shows different data sources for both the Polkadot and Kusama networks.

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

## Mapping Filters

Los filtros de mapeo son una característica extremadamente útil para decidir qué bloque, evento, o extrínseco activará un manejador de mapeo.

Sólo los datos entrantes que satisfagan las condiciones del filtro serán procesados por las funciones de mapeo. Los filtros de mapeo son opcionales, pero se recomiendan ya que reducen significativamente la cantidad de datos procesados por su proyecto SubQuery y mejorarán el rendimiento de indexación.

```yaml
# Ejemplo de Filtro de callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

La siguiente tabla explica los filtros soportados por diferentes manejadores.

| Manejador                                          | Filtro soportado             |
| -------------------------------------------------- | ---------------------------- |
| [Manejador de bloques](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler)         | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)           | `module`,`method` ,`success` |


-  Los filtros de módulos y métodos son compatibles con cualquier cadena basada en substrate.
- El filtro de `success` toma un valor booleano y puede ser utilizado para filtrar el extrínseco por su estado de éxito.
- El filtro `specVersion` especifica el rango de versión especificada para un bloque de substrate. Los siguientes ejemplos describen cómo establecer los rangos de versiones.

```yaml
filtro:
  specVersion: [23, 24] #Bloque de índice con specVersion entre 23 y 24 (incluido).
  specVersion: [100]      #Bloque de índice con specVersion mayor o igual a 100.
  specVersion: [null, 23] #Bloque de índice con specVersion menor o igual a 23.
```

## Cadenas Personalizadas

Puede indexar datos de cadenas personalizadas incluyendo tipos de cadena en el `project.yaml`. Declara los tipos específicos soportados por esta blockchain en `network.types`. Soportamos los tipos adicionales usados por los módulos de tiempo de ejecución de substrate.

`typesAlias`, `typesBundle`, `typesChain`, y `typesSpec` también son soportados.

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
