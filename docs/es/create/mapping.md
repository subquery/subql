# Mapeo

Las funciones de mapeo definen cómo se transforman los datos de la cadena en las entidades optimizadas GraphQL que hemos definido previamente en el archivo `schema.graphql`.

Los mapeos están escritos en un subconjunto de TypeScript llamado AssemblblyScript que se puede compilar en WASM (WebAssembly).
- Los mapeos se definen en el directorio `src/mappings` y se exportan como una función
- Estos mapeos también son exportados en `src/index.ts`
- Los archivos de mapeo son referencia en `project.yaml` bajo los manejadores de mapeo.

Hay tres clases de funciones de mapeo: [Manejadores de bloques](#block-handler), [Manejadores de eventos](#event-handler)y [Manejadores de llamadas](#call-handler).

## Manejador de bloques

Puede utilizar manejadores de bloques para capturar información cada vez que un nuevo bloque está conectado a la cadena Substrate, por ejemplo, el número de bloque. Para lograrlo, un BlockHandler definido será llamado una vez por cada bloque.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

Un [SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) es un tipo de interfaz extendida de [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), pero también incluye la `specVersion` y `timestamp`.

## Manejador del Evento

Puede utilizar manejadores de eventos para capturar información cuando ciertos eventos son incluidos en un nuevo bloque. Los eventos que son parte del tiempo de ejecución predeterminado de Substrate y un bloque pueden contener múltiples eventos.

Durante el procesamiento, el manejador de eventos recibirá un evento de substrate como argumento con las entradas y salidas del evento. Cualquier tipo de evento activará el mapeo, permitiendo la captura de la actividad con la fuente de datos. Debe utilizar [Filtros de Mapeo](./manifest.md#mapping-filters) en su manifiesto para filtrar eventos para reducir el tiempo que toma indexar los datos y mejorar el rendimiento de mapeo.

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

Un [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) es un tipo de interfaz extendida del [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Además de los datos del evento, también incluye una `id` (el bloque al que pertenece este evento) y el extrínseco dentro de este bloque.

## Manejador de llamada

Los manejadores de llamadas se utilizan cuando se desea capturar información sobre ciertos substrate extrínsecos.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). It is assigned an `id` (the block to which this extrinsic belongs) and provides an extrinsic property that extends the events among this block. Additionally, it records the success status of this extrinsic.

## Query States
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Therefore, we have exposed some of the @polkadot/api interfaces to increase capabilities.

These are the interfaces we currently support:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) will query the <strong>current</strong> block.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) will make multiple queries of the <strong>same</strong> type at the current block.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) will make multiple queries of <strong>different</strong> types at the current block.

These are the interfaces we do **NOT** support currently:
- ~~api.tx.*~~
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

## RPC calls

We also support some API RPC methods that are remote calls that allow the mapping function to interact with the actual node, query, and submission. A core premise of SubQuery is that it's deterministic, and therefore, to keep the results consistent we only allow historical RPC calls.

Documents in [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) provide some methods that take `BlockHash` as an input parameter (e.g. `at?: BlockHash`), which are now permitted. We have also modified these methods to take the current indexing block hash by default.

```typescript
// Let's say we are currently indexing a block with this hash number
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Original method has an optional input is block hash
const b1 = await api.rpc.chain.getBlock(blockhash);

// It will use the current block has by default like so
const b2 = await api.rpc.chain.getBlock();
```
- For [Custom Substrate Chains](#custom-substrate-chains) RPC calls, see [usage](#usage).

## Modules and Libraries

To improve SubQuery's data processing capabilities, we have allowed some of the NodeJS's built-in modules for running mapping functions in the [sandbox](#the-sandbox), and have allowed users to call third-party libraries.

Please note this is an **experimental feature** and you may encounter bugs or issues that may negatively impact your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### Built-in modules

Currently, we allow the following NodeJS modules: `assert`, `buffer`, `crypto`, `util`, and `path`.

Rather than importing the whole module, we recommend only importing the required method(s) that you need. Some methods in these modules may have dependencies that are unsupported and will fail on import.

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

Due to the limitations of the virtual machine in our sandbox, currently, we only support third-party libraries written by **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Custom Substrate Chains

SubQuery can be used on any Substrate-based chain, not just Polkadot or Kusama.

You can use a custom Substrate-based chain and we provide tools to import types, interfaces, and additional methods automatically using [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty) to explain the integration process.

### Preparation

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Siga los pasos de [configuración de metadatos PolkadotJS](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) para recuperar los metadatos de un nodo de su punto final **HTTP**.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
o desde su punto final **websocket** con la ayuda de [`websocat`](https://github.com/vi/websocat):

```shell
//Instalar el websocat
brew install websocat

//Obtener metadatos
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

A continuación, copie y pegue la salida a un archivo JSON. In our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty), we have created `api-interface/kitty.json`.

#### Tipos de definición
Asumimos que el usuario conoce los tipos específicos y el soporte RPC de la cadena, y está definido en el [Manifiesto](./manifest.md).

Siguiendo [tipos de configuración](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), creamos :
- `src/api-interfaces/definitions.ts` - esto exporta todas las definiciones de la sub-carpeta

```ts
exportar { default as kitties } desde './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - escriba definiciones para el módulo kitties
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
                },
                {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                }
            ],
            type: 'Balance'
        }
    }
}
```

#### Paquetes

- En el paquete `package.json`, asegúrate de añadir `@polkadot/typegen` como dependencia de desarrollo y `@polkadot/api` como dependencia regular (idealmente la misma versión). También necesitamos `ts-node` como una dependencia de desarrollo para ayudarnos a ejecutar los scripts.
- Añadimos scripts para ejecutar ambos tipos; `generate:defs` y metadatos `generar:meta` generadores (en ese orden, así los metadatos pueden usar los tipos).

Aquí hay una versión simplificada de `package.json`. Asegúrate de que en la sección **scripts** el nombre del paquete es correcto y los directorios son válidos.

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

### Generación de Código

Ahora que la preparación está completa, estamos preparados para generar tipos y metadatas. Ejecutar los siguientes comandos:

```shell
# Yarn para instalar nuevas dependencias
yarn

# Genera tipos
yarn generate:defs
```

En cada carpeta de módulos (por ejemplo, `/kitties`), ahora debería haber un manejador `types.ts` que define todas las interfaces de las definiciones de estos módulos, también un archivo `index.ts` que las exporta todas.

```shell
# Genera metadatos
yarn generate:meta
```

Este comando generará los metadatos y un nuevo complemento para las APIs. Como no queremos usar la API incorporada, necesitaremos reemplazarlos agregando una anulación explícita en nuestro `tsconfig.json`. Después de las actualizaciones, las rutas en la configuración se verán así (sin los comentarios):

```json
{
  "compilerOptions": {
      // este es el nombre del paquete que usamos (en la interfaz de importaciones, --package para generadors) */
      "kitty-birthinfo/*": ["src/*"],
      // aquí reemplazamos la mejora @polkadot/api por la nuestra, generado desde la cadena
      "@polkadot/api/augment": ["src/interfaces/augment-api. s"],
      // reemplazar los tipos aumentados por los nuestros, as generated from definitions
      "@polkadot/types/augment": ["src/interfaces/augment-types. s"]
    }
}
```

### Uso

Ahora en la función de mapeo, podemos mostrar cómo los metadatos y los tipos realmente decoran la API. El endpoint RPC soportará los módulos y métodos que declaramos anteriormente. Y para usar una llamada rpc personalizada, por favor vea la sección [Llamadas rpc de cadena personalizadas](#custom-chain-rpc-calls)
```typescript
export async function kittyApiHandler(): Promise<void> {
    // devuelve el tipo de Kitty
    const nextKittyId = await api. Ojalá. entidades. extKittyId();
    // devuelve el tipo Kitty, los tipos de parámetros de entrada son AccountId y KittyIndex
    const allKitties = await api. uery.kitties.kitties('xxxxxxxxxx',123)
    logger. nfo(`Next kitty id ${nextKittyId}`)
    //Custom rpc, establecer indefinido a blockhash
    const kittyPrice = await api. pc.kitties.getKittyPrice(undefined,nextKittyId);
}
```

**Si desea publicar este proyecto en nuestro explorador, por favor incluya los archivos generados en `src/api-interfaces`.**

### Llamadas rpc de cadena personalizadas

Para soportar llamadas RPC personalizadas, debemos inyectar manualmente definiciones RPC para `typesBundle`, permitiendo la configuración por especificación. Puede definir el `typesBundle` en el `project.yml`. Y por favor recuerde que sólo se soportan los tipos de llamadas `isHistórico`.
```yaml
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
                  {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                  }
                ],
                type: "Balance",
            }
          }
        }
      }
    }
  }

```
