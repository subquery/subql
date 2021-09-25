# Archivo del manifiesto

El Manifiesto `project.yaml` puede ser visto como un punto de entrada de tu proyecto y define la mayoría de los detalles sobre cómo SubQuery indexará y transformará los datos en cadena.

El manifiesto puede estar en formato YAML o JSON. En este documento, utilizaremos YAML en todos los ejemplos. A continuación se muestra un ejemplo estándar de un `project.yaml` básico.

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

- `network.endpoint` define el punto final wss o ws del blockchain a ser indexado - **Este debe ser un nodo de archivo completo**.
- `network.dictionary` optionally provides the HTTP endpoint of a full chain dictionary to speed up processing - see [Running an Indexer](../run/run.md#using-a-dictionary)
- `dataSources` define los datos que serán filtrados y extraídos y la ubicación del manejador de función de mapeo para que la transformación de datos sea aplicada.
  - `kind` solo soporta `substrate/Runtime` por ahora.
  - `startBlock` especifica la altura del bloque para comenzar a indexar.
  - `filter` filtrará la fuente de datos a ejecutar por el nombre de la especificación de punto final de red, vea [network filters](#network-filters)
  - `mapping.handlers` listará todas las [funciones de mapeo](./mapping.md) y sus correspondientes tipos de manejador, con [filtros de mapeo](#mapping-filters) adicionales.

## Filtros de Red

Generalmente el usuario creará una SubQuery y esperará reutilizarla tanto para sus entornos de testnet como para mainnet (por ejemplo, Polkadot y Kusama). Entre redes, es probable que varias opciones sean diferentes (por ejemplo, el bloque de inicio del índice). Por lo tanto, permitimos a los usuarios definir diferentes detalles para cada fuente de datos, lo que significa que un proyecto de SubQuery puede ser utilizado en múltiples redes.

Los usuarios pueden agregar un `filtro` en `fuentes de datos` para decidir qué fuente de datos ejecutar en cada red.

A continuación hay un ejemplo que muestra diferentes fuentes de datos para las redes Polkadot y Kusama.

```yaml
...
network:
  endpoint: "ws://polkadot.api.onfinality. o/public-ws"

#Crea una plantilla para evitar redundancia
definiciones:
  mapeo: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter: #Opcional
        specName: polkadot
    startBlock: 1000
    mapeo: *mymapping #use la plantilla aquí
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapeo: *mymapping # puede reutilizar o cambiar
```

## Filtros de mapeo

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
