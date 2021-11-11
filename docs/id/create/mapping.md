# Pemetaan

Fungsi pemetaan menentukan bagaimana data chain diubah menjadi entitas GraphQL yang dioptimalkan yang sebelumnya telah kita tentukan di file `schema.graphql`.

- Pemetaan ditentukan di direktori `src/mappings` dan diekspor sebagai sebuah fungsi
- Pemetaan ini juga diekspor di `src/index.ts`
- File pemetaan adalah referensi di `project.yaml` di bawah penanganan pemetaan.

Ada tiga kelas fungsi pemetaan; [Penangan blokir](#block-handler), [Penangan Peristiwa](#event-handler), dan [Penangan Panggilan](#call-handler).

## Penanganan Balok

Anda dapat menggunakan penangan blok untuk menangkap informasi setiap kali blok baru dilampirkan ke rantai Substrat, mis. nomor blok. Untuk mencapai ini, BlockHandler yang ditentukan akan dipanggil sekali untuk setiap blok.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Buat baru dengan StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[SubstrateBlock](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16) adalah jenis interface yang diperluas dari [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/), tetapi juga menyertakan `specVersion` dan `timestamp`.

## Penanganan Acara

Anda dapat menggunakan event handler untuk menangkap informasi saat event tertentu disertakan pada blok baru. Peristiwa yang merupakan bagian dari runtime Substrat default dan blok dapat berisi beberapa peristiwa.

Selama pemrosesan, event handler akan menerima event substrat sebagai argumen dengan input dan output yang diketik dari event. Semua jenis peristiwa akan memicu pemetaan, memungkinkan aktivitas dengan sumber data ditangkap. Anda harus menggunakan [Filter Pemetaan](./manifest.md#mapping-filters) dalam manifes Anda untuk memfilter peristiwa guna mengurangi waktu yang diperlukan untuk mengindeks data dan meningkatkan kinerja pemetaan.

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

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) adalah jenis interface yang diperluas dari [EventRecord](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149). Selain data acara, ini juga menyertakan `id` (blok tempat kejadian ini berada) dan ekstrinsik di dalam blok ini.

## Penanganan Telepon

Penangan panggilan digunakan bila Anda ingin menangkap informasi tentang ekstrinsik media tertentu.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21) memperluas [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170). Ini diberi `id` (blok tempat ekstrinsik ini berada) dan menyediakan properti ekstrinsik yang memperluas kejadian di antara blok ini. Selain itu, ia mencatat status keberhasilan ekstrinsik ini.

## Keadaan Kueri
Our goal is to cover all data sources for users for mapping handlers (more than just the three interface event types above). Oleh karena itu, kami telah mengekspos beberapa antarmuka @polkadot/api untuk meningkatkan kemampuan.

Ini adalah antarmuka yang saat ini kami dukung:
- [api.query.&lt;module&gt;.&lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) akan mengkueri balok <strong>current</strong>.
- [api.query.&lt;module&gt;.&lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) akan membuat beberapa jenis kueri yang <strong>sama</strong> di balok saat ini.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) akan membuat beberapa jenis kueri <strong>berbeda</strong> di balok saat ini.

Ini adalah antarmuka yang kami **TIDAK** dukung saat ini:
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

Lihat contoh penggunaan API ini dalam contoh kasus penggunaan [validator-threshold](https://github.com/subquery/tutorials-validator-threshold) kami.

## Panggilan RPC

Kami juga mendukung beberapa metode API RPC yang merupakan panggilan jarak jauh yang memungkinkan fungsi pemetaan berinteraksi dengan node, kueri, dan pengiriman aktual. Premis inti SubQuery adalah sifatnya yang deterministik, dan oleh karena itu, untuk menjaga agar hasil tetap konsisten, kami hanya mengizinkan panggilan RPC historis.

Dokumen di [JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) menyediakan beberapa metode yang menggunakan `BlockHash` sebagai parameter input (mis. `di?: BlockHash`), yang sekarang diizinkan. Kami juga telah memodifikasi metode ini untuk mengambil hash blok pengindeksan saat ini secara default.

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

Untuk meningkatkan kemampuan pemrosesan data SubQuery, kami telah mengizinkan beberapa modul bawaan NodeJS untuk menjalankan fungsi pemetaan di [sandbox](#the-sandbox), dan mengizinkan pengguna untuk memanggil perpustakaan pihak ketiga.

Harap perhatikan bahwa ini adalah **fitur eksperimental** dan Anda mungkin mengalami bug atau masalah yang dapat berdampak negatif pada fungsi pemetaan Anda. Laporkan setiap bug yang Anda temukan dengan membuat masalah di [GitHub](https://github.com/subquery/subql).

### Modul bawaan

Saat ini, kami mengizinkan modul NodeJS berikut: `assert`, `buffer`, `crypto`, `util`, dan `path `.

Daripada mengimpor seluruh modul, kami sarankan hanya mengimpor metode yang diperlukan yang Anda butuhkan. Beberapa metode dalam modul ini mungkin memiliki dependensi yang tidak didukung dan akan gagal saat diimpor.

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

Karena keterbatasan mesin virtual di kotak pasir kami, saat ini, kami hanya mendukung pustaka pihak ketiga yang ditulis oleh **CommonJS**.

Kami juga mendukung pustaka **hibrida** seperti `@polkadot/*` yang menggunakan ESM sebagai default. Namun, jika ada pustaka lain yang bergantung pada modul apa pun dalam format **ESM**, mesin virtual akan **TIDAK** mengompilasi dan mengembalikan kesalahan.

## Chain Substrat Kustom

SubQuery dapat digunakan pada rantai berbasis Substrat, tidak hanya Polkadot atau Kusama.

Anda dapat menggunakan rantai berbasis Substrat khusus dan kami menyediakan alat untuk mengimpor jenis, antarmuka, dan metode tambahan secara otomatis menggunakan [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/).

Di bagian berikut, kami menggunakan [contoh kitty](https://github.com/subquery/tutorials-kitty-chain) kami untuk menjelaskan proses integrasi.

### Persiapan

Buat direktori baru `api-interfaces` di bawah folder proyek `src` untuk menyimpan semua file yang diperlukan dan dibuat. Kami juga membuat direktori `api-interfaces/kitties` karena kami ingin menambahkan dekorasi di API dari modul `kitties`.

#### Metadata

Kami membutuhkan metadata untuk menghasilkan titik akhir API yang sebenarnya. Dalam contoh kitty, kami menggunakan endpoint dari testnet lokal, dan menyediakan tipe tambahan. Ikuti langkah-langkah di [penyiapan metadata PolkadotJS](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) untuk mengambil metadata node dari titik akhir **HTTP**-nya.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
atau dari titik akhir **websocket** dengan bantuan dari [`websocat`](https://github.com/vi/websocat):

```shell
//Instal websocat
brew install websocat

//Dapatkan metadata
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Selanjutnya, salin dan tempel hasilnya ke file JSON. Dalam [contoh kitty](https://github.com/subquery/tutorials-kitty-chain) kami, kami telah membuat `api-interface/kitty.json`.

#### Definisi jenis
Kami berasumsi bahwa pengguna mengetahui jenis spesifik dan dukungan RPC dari rantai, dan itu didefinisikan dalam [Manifest](./manifest.md).

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

Berikut adalah versi sederhana dari `package.json`. Pastikan di bagian **scripts** nama paket sudah benar dan direktorinya valid.

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

Sekarang setelah persiapan selesai, kami siap untuk menghasilkan jenis dan metadata. Jalankan perintah di bawah ini:

```shell
# Yarn untuk menginstal ketergantungan baru
yarn

# Menghasilkan jenis
yarn generate:defs
```

Di setiap folder modul (misalnya `/kitties`), sekarang seharusnya ada `types.ts` yang dihasilkan yang mendefinisikan semua antarmuka dari definisi modul ini, juga file `indeks.ts` yang mengekspor semuanya.

```shell
# Menghasilkan metadata
yarn generate:meta
```

Perintah ini akan menghasilkan metadata dan penambahan api baru untuk API. Karena kami tidak ingin menggunakan API bawaan, kami perlu menggantinya dengan menambahkan penggantian eksplisit di `tsconfig.json` kami. Setelah pembaruan, jalur di konfigurasi akan terlihat seperti ini (tanpa komentar):

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

Sekarang dalam fungsi pemetaan, kita dapat menunjukkan bagaimana metadata dan tipe benar-benar menghiasi API. Titik akhir RPC akan mendukung modul dan metode yang kami nyatakan di atas. Dan untuk menggunakan panggilan rpc khusus, silakan lihat bagian [Panggilan rpc berantai khusus](#custom-chain-rpc-calls)
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

**Jika Anda ingin memublikasikan proyek ini ke penjelajah kami, harap sertakan file yang dihasilkan di `src/api-interfaces`.**

### Panggilan rpc chain kustom

Untuk mendukung panggilan RPC berantai yang disesuaikan, kita harus memasukkan definisi RPC secara manual untuk `typesBundle`, yang memungkinkan konfigurasi per spesifikasi. Anda dapat menentukan `typesBundle` di `project.yml`. Dan harap diingat hanya jenis panggilan `isHistoric` yang didukung.
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
