# Pemetaan

Fungsi pemetaan menentukan bagaimana data chain diubah menjadi entitas GraphQL yang dioptimalkan yang sebelumnya telah kita tentukan di file `schema.graphql`.

Pemetaan dituliskan di seubset TypeScript yang disebut Assembly Script yang bisa dikumpulkan menjadi WASM (Web Assembly).
- Pemetaan ditentukan di direktori `src/mappings` dan diekspor sebagai sebuah fungsi
- Pemetaan ini juga diekspor di `src/index.ts`
- File pemetaan adalah referensi di `project.yaml` di bawah penanganan pemetaan.

Ada tiga kelas fungsi pemetaan;[Block handlers](#block-handler), [Event Handlers](#event-handler), and [Call Handlers](#call-handler).

## Penanganan Balok

Anda bisa menggunakan penanganan balok untuk menangkap informasi setiap kali balok baru terlampir ke chain Substrat, misal balok angka. Untuk meraih ini, BlockHandler yang ditentukan akan dipanggil sekali untuk setiap balok.

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

Anda bisa menggunakan penanganan acara untuk menangkap informasi saat acara tertentu disertakan di balok baru. Acara yang merupakan bagian dari runtime Substrat default dan balok mungkin berisi beberapa acara.

Selama pemrosesan, penanganan acara akan menerima acara substrat sebagai argumen dengan input dan output acara. Segala jenis acara akan memicu pemetaan, mengizinkan aktivitas dengan sumber data untuk ditangkap. Anda harus menggunakan [Filter Pemetaan](./manifest.md#mapping-filters) di manifest Anda untuk memfilter acara untuk mengurangi waktu yang diperlukan untuk mengindeks data dan meningkatkan performa pemetaan.

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

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) merupakan jenis antarmuka yang diperluas dari [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Selain data acara, juga menyertakan `id` (balok yang merupakan milik acara ini) dan ekstrinsik di dalam balok ini.

## Penanganan Telepon

Penanganan telepon digunakan saat Anda ingin menangkap informasi pada ekstrinsik substrat tertentu.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) memperluas [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). Ditandai `id` (balok yang merupakan milik ekstrinsik ini) dan memberikan properti ekstrinsik yang memperluas acara di antara balok ini. Tambahannya, mencatat status kesuksesan ekstrinsik ini.

## Keadaan Kueri
Tujuan kami adalah menutupi semua sumber data untuk pengguna untuk penanganan pemetaan (lebih dari hanya tiga jenis acara antarmuka di atas). Dengan demikian, kami telah membuka sebagian antarmuka @polkadot/api untuk meningkatkan kemampuan.

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

Kami juga mendukung metode API RPC yang merupakan panggilan jarak jauh yang mengizinkan fungsi pemetaan untuk berinteraksi dengan node, kueri, dan pengumpulan sesungguhnya. Premis inti SubQuery adalah sifatnya yang deterministik, dan oleh karena itu, untuk menjaga agar hasil tetap konsisten, kami hanya mengizinkan panggilan RPC historis.

Dokumen di [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) memberikan beberapa metode yang mengambil `BlockHash` sebagai parameter input (mis. `at?: BlockHash`), yang sekarang diizinkan. Kami juga telah mengubah metode-metode ini untuk mengambil block hash pengindeks saat ini secara default.

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

Mohon ingat ini adalah **fitur eksperimental** dan Anda mungkin menemui bugs atau masalah yang mungkin mempengaruhi fungsi pemetaan Anda secara negatif. Mohon laporkan bugs apa pun yang Anda temukan dengan membuat isu di [GitHub](https://github.com/subquery/subql).

### Modul bawaan

Saat ini, kami mengizinkan modul NodeJS berikut ini: `assert`, `buffer`, `crypto`, `util`, dan `path`.

Daripada mengimpor seluruh modul, kami menyarankan hanya mengimpor metode diperlukan yang Anda butuhkan. Sebagian metode di modul-modul ini mungkin memiliki ketergantungan yang tidak didukung dan akan gagal pada pengimporan.

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

Kami hanya mendukung perpustakaan **hybrid** seperti `@polkadot/*` yang menggunakan ESM sebagai default. Akan tetapi, jika perpustakaan lain bergantung pada modul apa pun dalam format **ESM**, mesin virtual **TIDAK** akan menyusun dan memberikan error.

## Chain Substrat Kustom

SubQuery bisa digunakan pada chain berbasis Substrat apa pun, tidak hanya Polkadot atau Kusama.

Anda bisa menggunakan chain berbasis Substrat dan kami menyediakan alat-alat untuk mengimpor jenis, antarmuka, dan metode tambahan secara otomatis menggunakan [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

Di bagian berikut, kami menggunakan [contoh anak kucing](https://github.com/subquery/subql-examples/tree/main/kitty) kami untuk menjelaskan proses integrasi.

### Persiapan

Buat direktori baru `api-interfaces` di bawah proyek folder `src` untuk menyimpan semua file yang diperlukan dan dihasilkan. Kami juga membuat direktory `api-interfaces/kitties` karena kami ingin menambahkan dekorasi di API dari modul `kitties`.

#### Metadata

Kami memerlukan metadata untuk menghasilkan endpoint API yang sesungguhnya. Di contoh anak kucing, kami menggunakan endpoint dari testnet lokal, dan memberikan jenis tambahan. Ikuti langkah-langkah di pengaturan metadata [PolkadotJS](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) untuk mengambil metadata node dari endpoint **HTTP**.

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

Berikutnya, salin dan tempelkan output ke file JSON. Di [contoh anak kucing](https://github.com/subquery/subql-examples/tree/main/kitty) kami, kami telah membuat `api-interface.kitty.json`.

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

- Di file `package.json`, pastikan untuk menambahkan `@polkadot/typegen` sebagai ketergantungan pembangunan dan `@polkadot/api` sebagai ketergantungan biasa (idealnya versi yang sama). Kita juga memerlukan `ts-node` sebagai ketergantungan pembangunan untuk membantu kita menjalankan script.
- Kita menambahkan script untuk menjalankan kedua jenis; `generate:defs` dan penghasil `generate:meta` metadata (dalam urutan itu, sehingga metadata bisa menggunakan jenisnya).

Berikut adalah versi `package.json` yang disederhanakan. Pastikan di bagian **scripts** nama paketnya betul dan direktorinya valid.

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

Sekarang setelah persiapannya selesai, kita siap untuk menghasilkan jenis dan metadata. Jalankan perintah di bawah ini:

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

Perintah ini akan menghasilkan metadata dan api-augment baru untuk API. Karena kita tidak ingin menggunakan API bawaan, kita akan perlu menggantinya dengan menambahkan timpaan eksplisit di `tsconfig.json` kami. Setelah pembaruan, path di config akan terlihat seperti ini (tanpa komentarnya):

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

Sekarang di fungsi pemetaan, kita bisa menunjukkan bagaimana metadata dan jenis sebenarnya menghias API. Endpoint RPC akan mendukung modul dan metode yang kita nyatakan di atas. Dan untuk menggunakan panggilan rpc kustom, mohon lihat bagian [Panggilan rpc chain kustom](#custom-chain-rpc-calls)
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

Untuk mendukung panggilan RPC chain yang dikustom, kami harus secara manual memasukkan definisi RPC untuk `typesBundle`, mengizinkan konfigurasi per-spek. Anda bisa menentukan `typesBundle` di `project.yml`. Dan mohon ingat hanya jenis panggilan `isHistoric` yang didukung.
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
