# Zuordnung

Zuordnungsfunktionen definieren, wie Kettendaten in die optimierten GraphQL-Entitäten umgewandelt werden, die wir zuvor in der Datei `schema.graphql` definiert haben.

Mappings werden in einer Teilmenge von TypeScript namens AssemblyScript geschrieben, die in WASM (WebAssembly) kompiliert werden kann.
- Mappings werden im Verzeichnis `src/mappings` definiert und als Funktion exportiert
- Diese Zuordnungen werden auch in `src/index.ts` exportiert
- Die Mapping-Dateien sind in `project.yaml` unter den Mapping-Handlern referenziert.

Es gibt drei Klassen von Zuordnungsfunktionen; [Blockhandler](#block-handler), [Ereignishandler](#event-handler) und [Anrufhandler](#call-handler).

## Blockhandler

Sie können Blockhandler verwenden, um jedes Mal Informationen zu erfassen, wenn ein neuer Block an die Substratkette angehängt wird, z. Blocknummer. Dazu wird für jeden Block einmal ein definierter BlockHandler aufgerufen.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

Ein [SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) ist ein erweiterter Schnittstellentyp von [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), beinhaltet aber auch die `specVersion` und den `timestamp`.

## Ereignishandler

Sie können Ereignishandler verwenden, um Informationen zu erfassen, wenn bestimmte Ereignisse in einem neuen Block enthalten sind. Die Ereignisse, die Teil der standardmäßigen Substrate-Laufzeit und ein Block sind, können mehrere Ereignisse enthalten.

Während der Verarbeitung erhält der Ereignishandler ein Substratereignis als Argument mit den typisierten Ein- und Ausgaben des Ereignisses. Jede Art von Ereignis löst das Mapping aus, sodass Aktivitäten mit der Datenquelle erfasst werden können. Sie sollten in Ihrem Manifest [Zuordnungsfilter](./manifest.md#mapping-filters) verwenden, um Ereignisse zu filtern, um die Zeit zum Indexieren von Daten zu verkürzen und die Zuordnungsleistung zu verbessern.

```ts
importiere {SubstrateEvent} aus "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
     const {Ereignis: {Daten: [Konto, Kontostand]}} = Ereignis;
     // Abrufen des Datensatzes nach seiner ID
     const record = new starterEntity(event.extrinsic.block.block.header.hash.toString());
     record.field2 = account.toString();
     record.field3 = (saldo als Balance).toBigInt();
     warten record.save();
```

Ein [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) ist ein erweiterter Schnittstellentyp des [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Neben den Ereignisdaten enthält es auch eine `id` (der Block, zu dem dieses Ereignis gehört) und die Extrinsic innerhalb dieses Blocks.

## Call Handler

Call-Handler werden verwendet, wenn Sie Informationen zu bestimmten externen Substraten erfassen möchten.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    warten record.save();
}
```

Das [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) erweitert [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). Ihm wird eine `id` zugewiesen (der Block, zu dem diese Extrinsic gehört) und stellt eine extrinsische Eigenschaft bereit, die die Ereignisse innerhalb dieses Blocks erweitert. Darüber hinaus zeichnet es den Erfolgsstatus dieses Extrinsic auf.

## Abfragestatus
Unser Ziel ist es, alle Datenquellen für Benutzer für das Mapping von Handlern abzudecken (mehr als nur die drei oben genannten Schnittstellenereignistypen). Aus diesem Grund haben wir einige der @polkadot/api-Schnittstellen bereitgestellt, um die Fähigkeiten zu erweitern.

Dies sind die Schnittstellen, die wir derzeit unterstützen:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) fragt den <strong>aktuellen</strong> Block ab.
- 72 / 5000 [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) führt im aktuellen Block mehrere Abfragen des <strong>gleichen</strong>-Typs durch.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) führt im aktuellen Block mehrere Abfragen <strong>verschiedener</strong> Typen durch.

Dies sind die Schnittstellen, die wir derzeit **NICHT** unterstützen:
- ~~api.tx.*~~
- ~~api.derive.*~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.at~~
- ~~api.abfrage.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.hash~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.range~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.sizeAt~~

Sehen Sie sich ein Beispiel für die Verwendung dieser API in unserem [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold)-Beispielanwendungsfall an.

## RPC-Anrufe

Wir unterstützen auch einige API-RPC-Methoden, bei denen es sich um Remoteaufrufe handelt, die es der Zuordnungsfunktion ermöglichen, mit dem tatsächlichen Knoten, der Abfrage und der Übermittlung zu interagieren. Eine Kernprämisse von SubQuery ist, dass es deterministisch ist. Um die Ergebnisse konsistent zu halten, erlauben wir daher nur historische RPC-Aufrufe.

Dokumente in [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) stellen einige Methoden bereit, die `BlockHash` als Eingabeparameter verwenden (z. B. `at?: BlockHash`), die jetzt erlaubt sind. Wir haben diese Methoden auch geändert, um standardmäßig den aktuellen Indexierungsblock-Hash zu verwenden.

```typescript
// Nehmen wir an, wir indizieren gerade einen Block mit dieser Hash-Nummer
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Originalmethode hat eine optionale Eingabe ist Blockhash
const b1 = warten api.rpc.chain.getBlock(blockhash);

// Es wird der aktuelle Block verwendet, der standardmäßig so ist
const b2 = api.rpc.chain.getBlock() erwarten;
```
- Informationen zu [Benutzerdefinierten Substratketten](#custom-substrate-chains) RPC-Aufrufen finden Sie unter [Verwendung](#usage).

## Module und Bibliotheken

Um die Datenverarbeitungsfähigkeiten von SubQuery zu verbessern, haben wir einige der integrierten Module von NodeJS zum Ausführen von Mapping-Funktionen in der [Sandbox](#the-sandbox) zugelassen und den Benutzern erlaubt, Bibliotheken von Drittanbietern aufzurufen.

Bitte beachten Sie, dass dies eine **experimentelle Funktion** ist und Sie möglicherweise auf Fehler oder Probleme stoßen, die sich negativ auf Ihre Mapping-Funktionen auswirken können. Bitte melden Sie alle Fehler, die Sie finden, indem Sie ein Problem in [GitHub](https://github.com/subquery/subql) erstellen.

### Eingebaute Module

Derzeit erlauben wir die folgenden NodeJS-Module: `assert`, `buffer`, `crypto`, `util` und `path`.

Anstatt das gesamte Modul zu importieren, empfehlen wir, nur die erforderliche(n) Methode(n) zu importieren. Einige Methoden in diesen Modulen weisen möglicherweise nicht unterstützte Abhängigkeiten auf und schlagen beim Importieren fehl.

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### Bibliotheken von Drittanbietern

Due to the limitations of the virtual machine in our sandbox, currently, we only support third-party libraries written by **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Custom Substrate Chains

SubQuery can be used on any Substrate-based chain, not just Polkadot or Kusama.

You can use a custom Substrate-based chain and we provide tools to import types, interfaces, and additional methods automatically using [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

In the following sections, we use our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty) to explain the integration process.

### Preparation

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Follow the steps in [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) to retrieve a node's metadata from its **HTTP** endpoint.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
or from its **websocket** endpoint with help from [`websocat`](https://github.com/vi/websocat):

```shell
//Install the websocat
brew install websocat

//Get metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/subql-examples/tree/main/kitty), we have created `api-interface/kitty.json`.

#### Type definitions
We assume that the user knows the specific types and RPC support from the chain, and it is defined in the [Manifest](./manifest.md).

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
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
```

#### Packages

- In the `package.json` file, make sure to add `@polkadot/typegen` as a development dependency and `@polkadot/api` as a regular dependency (ideally the same version). We also need `ts-node` as a development dependency to help us run the scripts.
- We add scripts to run both types; `generate:defs` and metadata `generate:meta` generators (in that order, so metadata can use the types).

Here is a simplified version of `package.json`. Make sure in the **scripts** section the package name is correct and the directories are valid.

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

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# Yarn to install new dependencies
yarn

# Generate types
yarn generate:defs
```

In each modules folder (eg `/kitties`), there should now be a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` that exports them all.

```shell
# Generate metadata
yarn generate:meta
```

This command will generate the metadata and a new api-augment for the APIs. As we don't want to use the built-in API, we will need to replace them by adding an explicit override in our `tsconfig.json`. After the updates, the paths in the config will look like this (without the comments):

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

Now in the mapping function, we can show how the metadata and types actually decorate the API. The RPC endpoint will support the modules and methods we declared above. And to use custom rpc call, please see section [Custom chain rpc calls](#custom-chain-rpc-calls)
```typescript
export async function kittyApiHandler(): Promise<void> {
    //return the KittyIndex type
    const nextKittyId = await api.query.kitties.nextKittyId();
    // return the Kitty type, input parameters types are AccountId and KittyIndex
    const allKitties  = await api.query.kitties.kitties('xxxxxxxxx',123)
    logger.info(`Next kitty id ${nextKittyId}`)
    //Custom rpc, set undefined to blockhash
    const kittyPrice = await api.rpc.kitties.getKittyPrice(undefined,nextKittyId);
}
```

**If you wish to publish this project to our explorer, please include the generated files in `src/api-interfaces`.**

### Custom chain rpc calls

To support customised chain RPC calls, we must manually inject RPC definitions for `typesBundle`, allowing per-spec configuration. You can define the `typesBundle` in the `project.yml`. And please remember only `isHistoric` type of calls are supported.
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
