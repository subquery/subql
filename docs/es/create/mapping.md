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

El [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extiende [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). Se le asigna un `id` (el bloque al que pertenece este extrínseco) y proporciona una propiedad extrínseca que extiende los eventos entre este bloque. Además, registra el estado de éxito de este extrínseco.

## Estados de Consulta
Nuestro objetivo es cubrir todas las fuentes de datos para los usuarios de los manejadores de mapeo (más de los tres tipos de eventos de la interfaz anterior). Por lo tanto, hemos expuesto algunas de las interfaces @polkadot/api para aumentar las capacidades.

Estas son las interfaces que actualmente soportamos:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) consultará el bloque <strong></strong> actual.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) hará múltiples consultas del mismo tipo <strong></strong> en el bloque actual.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) hará múltiples consultas de <strong>diferentes</strong> tipos en el bloque actual.

Estas son las interfaces que actualmente no soportamos **NOT**:
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

## Llamadas RPC

También soportamos algunos métodos RPC API que son llamadas remotas que permiten que la función de mapeo interactúe con el nodo real, la consulta y el envío. Un núcleo principal de SubQuery es que es determinista, y por lo tanto, para mantener los resultados consistentes sólo permitimos llamadas históricas RPC.

Documentos en [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) proporcionan algunos métodos que toman `BlockHash` como parámetro de entrada (e.. `en?: BlockHash`), que ahora están permitidos. También hemos modificado estos métodos para tomar el hash del bloque de indexación actual por defecto.

```typescript
// Digamos que actualmente estamos indexando un bloque con este número hash
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// El método original tiene una entrada opcional es el hash del bloque
const b1 = await api. pc.chain.getBlock(blockhash);

// Utilizará el bloque actual por defecto como
const b2 = await api.rpc.chain.getBlock();
```
- Para [cadenas personalizadas de Substrate](#custom-substrate-chains) llamadas RPC, vea [uso](#usage).

## Módulos y librerías

Para mejorar las capacidades de procesamiento de datos de SubQuery, hemos permitido algunos de los módulos incorporados de NodeJS para ejecutar funciones de mapeo en el [sandbox](#the-sandbox), y han permitido a los usuarios llamar a bibliotecas de terceros.

Tenga en cuenta que esta es una **característica experimental** y puede encontrar errores o problemas que pueden afectar negativamente a sus funciones de mapeo. Por favor, informe de cualquier error que encuentre creando un problema en [GitHub](https://github.com/subquery/subql).

### Módulos incorporados

Actualmente, permitimos los siguientes módulos de NodeJS: `assert`, `buffer`, `crypto`, `util`, y `path`.

En lugar de importar todo el módulo, recomendamos importar sólo los método(s) requeridos que usted necesita. Algunos métodos en estos módulos pueden tener dependencias que no están soportadas y fallarán al importar.

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### Librería de terceros

Debido a las limitaciones de la máquina virtual en nuestro sandbox, actualmente sólo soportamos bibliotecas de terceros escritas por **CommonJS**.

También soportamos una librería **híbrida** como `@polkadot/*` que utiliza ESM como valor predeterminado. Sin embargo, si cualquier otra librería depende de cualquier módulo en formato **ESM**, la máquina virtual **NO** compilará y devolverá un error.

## Cadenas de Substrate Personalizadas

SubQuery puede ser usado en cualquier cadena basada en Substrate, no sólo en Polkadot o Kusama.

Puede utilizar una cadena personalizada basada en Substrate y proporcionamos herramientas para importar tipos, interfaces y métodos adicionales automáticamente usando [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty) to explain the integration process.

### Preparación

Crear un nuevo directorio `api-interfaces` bajo la carpeta `src` del proyecto para almacenar todos los archivos necesarios y generados. También creamos un directorio `api-interfaces/kitties` ya que queremos añadir decoración en la API desde el módulo `kitties`.

#### Metadatos

Necesitamos metadatos para generar los puntos finales actuales de la API. En el ejemplo del kitty utilizamos un punto final de una red de pruebas local, y proporciona tipos adicionales. Siga los pasos de [configuración de metadatos PolkadotJS](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) para recuperar los metadatos de un nodo de su punto final **HTTP**.

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
