# Pemetaan

Fungsi pemetaan menentukan bagaimana data chain diubah menjadi entitas GraphQL yang dioptimalkan yang sebelumnya telah kita tentukan di file `schema.graphql`.

Pemetaan dituliskan di seubset TypeScript yang disebut Assembly Script yang bisa dikumpulkan menjadi WASM (Web Assembly).
- Pemetaan ditentukan di direktori `src/mappings` dan diekspor sebagai sebuah fungsi
- Pemetaan ini juga diekspor di `src/index.ts`
- File pemetaan adalah referensi di `project.yaml` di bawah penanganan pemetaan.

Ada tiga kelas fungsi pemetaan;[Block handlers](#block-handler), [Event Handlers](#event-handler), and [Call Handlers](#call-handler).

## Penanganan Balok

You can use block handlers to capture information each time a new block is attached to the Substrate chain, e.g. block number. To achieve this, a defined BlockHandler will be called once for every block.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Buat baru dengan StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) adalah jenis antarmuka yang diperluas dari [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), tetapi juga menyertakan `specVersion` dan `timestamp`.

## Penanganan Acara

You can use event handlers to capture information when certain events are included on a new block. The events that are part of the default Substrate runtime and a block may contain multiple events.

During the processing, the event handler will receive a substrate event as an argument with the event's typed inputs and outputs. Any type of event will trigger the mapping, allowing activity with the data source to be captured. You should use [Mapping Filters](./manifest.md#mapping-filters) in your manifest to filter events to reduce the time it takes to index data and improve mapping performance.

```ts
import {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Ambil catatan berdasarkan IDnya
    const record = new starterEntity(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
```

A [SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) is an extended interface type of the [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Besides the event data, it also includes an `id` (the block to which this event belongs) and the extrinsic inside of this block.

## Penanganan Telepon

Penanganan telepon digunakan saat Anda ingin menangkap informasi pada ekstrinsik substrat tertentu.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

The [SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) extends [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). It is assigned an `id` (the block to which this extrinsic belongs) and provides an extrinsic property that extends the events among this block. Additionally, it records the success status of this extrinsic.

## Keadaan Kueri
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Therefore, we have exposed some of the @polkadot/api interfaces to increase capabilities.

Berikut adalah antarmuka yang saat ini kami dukung:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) akan mengkueri balok <strong>current</strong>.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) akan membuat beberapa jenis kueri yang <strong>sama</strong> di balok saat ini.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) akan membuat beberapa jenis kueri <strong>berbeda</strong> di balok saat ini.

Berikut antarmuka yang **TIDAK** kami dukung saat ini:
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

Lihat contoh menggunakan API ini di kasus contoh penggunaan [validator-threshold](https://github.com/subquery/subql-examples/tree/main/validator-threshold) kami.

## Panggilan RPC

We also support some API RPC methods that are remote calls that allow the mapping function to interact with the actual node, query, and submission. A core premise of SubQuery is that it's deterministic, and therefore, to keep the results consistent we only allow historical RPC calls.

Documents in [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) provide some methods that take `BlockHash` as an input parameter (e.g. `at?: BlockHash`), which are now permitted. We have also modified these methods to take the current indexing block hash by default.

```typescript
// Mari menganggap kita saat ini mengindeks balok dengan nomor hash ini
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Metode asli memiliki input opsional yang merupakan block hash
const b1 = await api.rpc.chain.getBlock(blockhash);

// Akan menggunakan balok saat ini secara default
const b2 = await api.rpc.chain.getBlock();
```
- Untuk panggilan RPC [Chain Substrat Kustom](#custom-substrate-chains), lihat [penggunaan](#usage).

## Modul dan Perpustakaan

Untuk meningkatkan kemampuan pemrosesan data SubQuery, kami telah mengizinkan sebagian modul bawaan NodeJS untuk menjalankan fungsi pemetaan di [sandbox](#the-sandbox), dan telah mengizinkan pengguna untuk memanggil perpustakaan pihak ketiga.

Please note this is an **experimental feature** and you may encounter bugs or issues that may negatively impact your mapping functions. Please report any bugs you find by creating an issue in [GitHub](https://github.com/subquery/subql).

### Modul bawaan

Saat ini, kami mengizinkan modul NodeJS berikut ini: `assert`, `buffer`, `crypto`, `util`, dan `path`.

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

### Perpustakaan pihak ketiga

Karena pembatasan mesin virtual di sandbox kami, saat ini, kami hanya mendukung perpustakaan pihak ketiga yang ditulis oleh **CommonJS**.

We also support a **hybrid** library like `@polkadot/*` that uses ESM as default. However, if any other libraries depend on any modules in **ESM** format, the virtual machine will **NOT** compile and return an error.

## Chain Substrat Kustom

SubQuery bisa digunakan pada chain berbasis Substrat apa pun, tidak hanya Polkadot atau Kusama.

Anda bisa menggunakan chain berbasis Substrat dan kami menyediakan alat-alat untuk mengimpor jenis, antarmuka, dan metode tambahan secara otomatis menggunakan [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

Di bagian berikut, kami menggunakan [contoh anak kucing](https://github.com/subquery/subql-examples/tree/main/kitty) kami untuk menjelaskan proses integrasi.

### Persiapan

Create a new directory `api-interfaces` under the project `src` folder to store all required and generated files. We also create an `api-interfaces/kitties` directory as we want to add decoration in the API from the `kitties` module.

#### Metadata

We need metadata to generate the actual API endpoints. In the kitty example, we use an endpoint from a local testnet, and it provides additional types. Follow the steps in [PolkadotJS metadata setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) to retrieve a node's metadata from its **HTTP** endpoint.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
atau dari endpoint **websocket** dengan bantuan dari [`wesocat`](https://github.com/vi/websocat):

```shell
//Instal websocat
brew install websocat

//Dapatkan metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Next, copy and paste the output to a JSON file. In our [kitty example](https://github.com/subquery/tutorials-kitty-chain), we have created `api-interface/kitty.json`.

#### Definisi jenis
Kami menganggap bahwa pengguna tahu jenis spesifik dan dukungan RPC dari chain, dan didefinisikan di [Manifest](./manifest.md).

Mengikuti [pengaturan jenis](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup), kami membuat :
- `src/api-interfaces/definitions.ts` - ini mengekspor semua definisi sub-folder

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - definisi jenis dari modul anak kucing
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

#### Paket

- In the `package.json` file, make sure to add `@polkadot/typegen` as a development dependency and `@polkadot/api` as a regular dependency (ideally the same version). We also need `ts-node` as a development dependency to help us run the scripts.
- Kita menambahkan script untuk menjalankan kedua jenis; `generate:defs` dan penghasil `generate:meta` metadata (dalam urutan itu, sehingga metadata bisa menggunakan jenisnya).

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

### Penghasil jenis

Now that preparation is completed, we are ready to generate types and metadata. Run the commands below:

```shell
# Yarn untuk menginstal ketergantungan baru
yarn

# Menghasilkan jenis
yarn generate:defs
```

Di setiap folder modul (mis `/kitties`), seharusnya sekarang ada `types.ts` yang dihasilkan yang menentukan semua antarmuka dari definisi modul ini, juga file `index.ts` yang mengeskpor semuanya.

```shell
# Menghasilkan metadata
yarn generate:meta
```

This command will generate the metadata and a new api-augment for the APIs. As we don't want to use the built-in API, we will need to replace them by adding an explicit override in our `tsconfig.json`. After the updates, the paths in the config will look like this (without the comments):

```json
{
  "compilerOptions": {
      // ini adalah nama paket yang kita gunakan (in the interface imports, --package for generators) */
      "kitty-birthinfo/*": ["src/*"],
      // di sini kita mengganti augmentasi @polkadot/api dengan milik kita sendiri, dihasilkan dari chain
      "@polkadot/api/augment": ["src/interfaces/augment-api.ts"],
      // mengganti jenis tambahan dengan milik kita sendiri, seperti yang dihasilkan dari definisi
      "@polkadot/types/augment": ["src/interfaces/augment-types.ts"]
    }
}
```

### Penggunaan

Now in the mapping function, we can show how the metadata and types actually decorate the API. The RPC endpoint will support the modules and methods we declared above. And to use custom rpc call, please see section [Custom chain rpc calls](#custom-chain-rpc-calls)
```typescript
export async function kittyApiHandler(): Promise<void> {
    //mengembalikan jenis KittyIndex
    const nextKittyId = await api.query.kitties.nextKittyId();
    //  mengembalikan jenis Kitty, jenis parameter input adalah AccountID dan KittyIndex
    const allKitties  = await api.query.kitties.kitties('xxxxxxxxx',123)
    logger.info(`Next kitty id ${nextKittyId}`)
    //Custom rpc, set undefined to blockhash
    const kittyPrice = await api.rpc.kitties.getKittyPrice(undefined,nextKittyId);
}
```

**Jika Anda ingin menerbitkan proyek ini ke penjelajah kami, mohon sertakan file yang dihasilkan di `src/api-interfaces`.**

### Panggilan rpc chain kustom

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
