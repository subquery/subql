# File Manifest

File Manifest `project.yaml` bisa dilihat sebagai titik masuk proyek Anda dan menentukan sebagian besar detil tentang bagaimana SubQuery akan mengindeks dan mengubah data chain.

Manifest bisa dalam format YAML atau JSON. Dalam dokumen ini, kita akan menggunakan YAML di semua contoh. Di bawah ini merupakan contoh standar `project.yaml` standar.

<CodeGroup>
  <CodeGroupItem title="v0.2.0" active> ``` yml spesifikasiVersi: 0.2.0 nama: contoh-proyek # Berikan nama proyek versi: 1.0.0 # Versi proyek deskripsi: '' # Deskripsi proyek Anda repositori: 'https://github.com/subquery/subql-starter' # Alamat repositori Git proyek Anda skema: file: ./schema.graphql # Lokasi file skema GraphQL Anda jaringan: genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' # Genesis hash jaringan titik akhir: 'wss://polkadot.api.onfinality.io/public-ws' # Secara opsional, berikan titik akhir HTTP dari kamus rantai lengkap untuk mempercepat pemrosesan kamus: 'https://api.subquery.network/sq/subquery/dictionary-polkadot' sumber data: - jenis: substrat/Waktu Proses startBlock: 1 # Ini mengubah blok awal pengindeksan Anda, setel ini lebih tinggi untuk melewati blok awal dengan lebih sedikit data peta: file: "./dist/index.js" penangan: - handler: handleBlock jenis: substrat/BlockHandler - handler: handleEvent jenis: substrat/EventHandler filter: #Filter adalah opsional modul: saldo metode: Setoran - handler: handleCall jenis: substrat/CallHandler ```` </0/1>
<CodeGroupItem title="v0.0.1"> ``` yml spesifikasiVersi: "0.0.1" deskripsi: '' # Deskripsi proyek Anda repositori: 'https://github.com/subquery/subql-starter' # Alamat repositori Git proyek Anda schema: ./schema.graphql # Lokasi file skema GraphQL Anda jaringan: titik akhir: 'wss://polkadot.api.onfinality.io/public-ws' # Secara opsional, berikan titik akhir HTTP dari kamus rantai lengkap untuk mempercepat pemrosesan kamus: 'https://api.subquery.network/sq/subquery/dictionary-polkadot' sumber data: - nama: utama jenis: substrat/Waktu Proses startBlock: 1 # Ini mengubah blok awal pengindeksan Anda, setel ini lebih tinggi untuk melewati blok awal dengan lebih sedikit data peta: penangan: - handler: handleBlock jenis: substrat/BlockHandler - handler: handleEvent jenis: substrat/EventHandler filter: #Filter bersifat opsional tetapi disarankan untuk mempercepat pemrosesan acara modul: saldo metode: Setoran - handler: handleCall jenis: substrat/CallHandler ```` </CodeGroupItem> </CodeGroup>

## Migrasi dari v0.0.1 ke v0.2.0 <Badge text="upgrade" type="warning"/>

**Jika Anda memiliki proyek dengan specVersion v0.0.1, Anda dapat menggunakan `subql migration` untuk meningkatkan versi dengan cepat. [Lihat di sini](#cli-options) untuk informasi lebih lanjut**

Di bawah `jaringan`:

- Ada bidang **wajib** `genesisHash` baru yang membantu mengidentifikasi rantai yang digunakan.
- Untuk v0.2.0 dan yang lebih baru, Anda dapat mereferensikan [file jenis rantai](#custom-chains) eksternal jika Anda mereferensikan rantai khusus.

Dibawah `dataSources`:

- Dapat langsung menautkan titik masuk `index.js` untuk pengendali pemetaan. Secara default `index.js` ini akan dihasilkan dari `index.ts` selama proses pembuatan.
- Sumber data sekarang dapat berupa sumber data waktu proses reguler atau [sumber data khusus](#custom-data-sources).

### CLI Pilihan

Meskipun versi spesifikasi v0.2.0 masih dalam versi beta, Anda perlu mendefinisikannya secara eksplisit selama inisialisasi proyek dengan menjalankan `subql init --specVersion 0.2.0 PROJECT_NAME`

`migrasi subql` dapat dijalankan di proyek yang ada untuk memigrasikan manifes proyek ke versi terbaru.

| Pilihan        | Deskripsi                                                          |
| -------------- | ------------------------------------------------------------------ |
| -f, --force    |                                                                    |
| -l, --location | folder lokal untuk menjalankan migrasi (harus berisi project.yaml) |
| --file=file    | untuk menentukan project.yaml yang akan dimigrasi                  |

## Gambaran

### Spesifikasi Tingkat Atas

| Bidang          | v0.0.1                              | v0.2.0                      | Deskripsi                                           |
| --------------- | ----------------------------------- | --------------------------- | --------------------------------------------------- |
| **specVersion** | String                              | String                      | `0.0.1` or `0.2.0` - versi spesifikasi file manifes |
| **name**        | 𐄂                                   | String                      | Nama proyek Anda                                    |
| **version**     | 𐄂                                   | String                      | Versi Proyek anda                                   |
| **description** | String                              | String                      | Deskripsi Proyek anda                               |
| **repository**  | String                              | String                      | Git alamat repositori proyek Anda                   |
| **schema**      | String                              | [Schema Spec](#schema-spec) | Lokasi file skema GraphQL Anda                      |
| **network**     | [Network Spec](#network-spec)       | Network Spec                | Detail jaringan yang akan diindeks                  |
| **dataSources** | [DataSource Spec](#datasource-spec) | DataSource Spec             |                                                     |

### Spesifikasi Skema

| Bidang   | v0.0.1 | v0.2.0 | Deskripsi                      |
| -------- | ------ | ------ | ------------------------------ |
| **file** | 𐄂      | String | Lokasi file skema GraphQL Anda |

### Network Spec

| Bidang          | v0.0.1 | v0.2.0        | Deskripsi                                                                                                                                                                                                                           |
| --------------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **genesisHash** | 𐄂      | String        | Hash asal jaringan                                                                                                                                                                                                                  |
| **endpoint**    | String | String        | Menentukan titik akhir wss atau ws dari blockchain yang akan diindeks - **Ini harus berupa node arsip lengkap**. Anda dapat mengambil titik akhir untuk semua parachains secara gratis dari [OnFinality](https://app.onfinality.io) |
| **dictionary**  | String | String        | Disarankan untuk menyediakan titik akhir HTTP dari kamus rantai lengkap untuk mempercepat pemrosesan - baca [cara kerja Kamus Subkueri](../tutorials_examples/dictionary.md).                                                       |
| **chaintypes**  | 𐄂      | {file:String} | File jenis jalur ke rantai, terima format `.json` atau `.yaml`                                                                                                                                                                      |

### Datasource Spec

Mendefinisikan data yang akan disaring dan diekstraksi dan lokasi pengendali fungsi pemetaan untuk transformasi data yang akan diterapkan.
| Field          | v0.0.1                                                    | v0.2.0                                                                           | Deskripsi                                                                                                                                                                                             |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **name**       | String                                                    | 𐄂                                                                                | Nama sumber data                                                                                                                                                                                      |
| **jenis**      | [substrate/Runtime](./manifest/#data-sources-and-mapping) | substrate/Runtime, [substrate/CustomDataSource](./manifest/#custom-data-sources) | Kami mendukung tipe data dari runtime substrat default seperti blok, peristiwa dan ekstrinsik (panggilan). <br /> Dari v0.2.0, kami mendukung data dari runtime khusus, seperti kontrak pintar. |
| **startBlock** | Integer                                                   | Integer                                                                          | Ini mengubah blok awal pengindeksan Anda, setel ini lebih tinggi untuk melewati blok awal dengan lebih sedikit data                                                                                   |
| **mapping**    | Mapping Spec                                              | Mapping Spec                                                                     |                                                                                                                                                                                                       |
| **filter**     | [network-filters](./manifest/#network-filters)            | 𐄂                                                                                | Filter sumber data untuk dieksekusi dengan nama spesifikasi titik akhir jaringan                                                                                                                      |

### Mapping Spec

| Field                  | v0.0.1                                                                  | v0.2.0                                                                                      | Deskripsi                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **file**               | String                                                                  | 𐄂                                                                                           | Jalur ke entri pemetaan                                                                                                                                                                                                         |
| **handlers & filters** | [Penangan dan filter default](./manifest/#mapping-handlers-and-filters) | Penangan dan filter default, <br />[Penangan dan filter khusus](#custom-data-sources) | Buat daftar semua [fungsi pemetaan](./mapping.md) dan jenis pengendali yang sesuai, dengan filter pemetaan tambahan. </><br /> Untuk pengendali pemetaan runtime kustom, lihat [Sumber data kustom](#custom-data-sources) |

## Sumber Data dan Pemetaan

Di bagian ini, kita akan berbicara tentang runtime substrat default dan pemetaannya. Berikut ini contohnya:

```yaml
sumber data:
   - jenis: substrat/Waktu Proses # Menunjukkan bahwa ini adalah waktu proses default
     startBlock: 1 # Ini mengubah blok awal pengindeksan Anda, setel ini lebih tinggi untuk melewati blok awal dengan lebih sedikit data
     pemetaan:
       file: dist/index.js # Jalur masuk untuk pemetaan ini
```

### Penangan pemetaan dan Filter

Tabel berikut menjelaskan filter yang didukung oleh penangan yang berbeda.

**Proyek SubQuery Anda akan jauh lebih efisien jika Anda hanya menggunakan event dan call handler dengan filter pemetaan yang sesuai**

| Handler                                    | Filter yang didukung         |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |

Filter pemetaan runtime default adalah fitur yang sangat berguna untuk memutuskan blok, peristiwa, atau ekstrinsik apa yang akan memicu pengendali pemetaan.

Hanya data masuk yang memenuhi kondisi filter yang akan diproses oleh fungsi pemetaan. Filter pemetaan bersifat opsional tetapi sangat disarankan karena secara signifikan mengurangi jumlah data yang diproses oleh proyek SubQuery Anda dan akan meningkatkan kinerja pengindeksan.

```yaml
# Contoh filter dari callHandler
Saring:
   modul: saldo
   metode: Setoran
   sukses: benar
```

- Filter modul dan metode didukung pada rantai berbasis media apa pun.
- Filter `sukses` mengambil nilai boolean dan dapat digunakan untuk memfilter ekstrinsik berdasarkan status keberhasilannya.
- Filter `specVersion` menentukan rentang versi spesifikasi untuk blok media. Contoh berikut menjelaskan cara menyetel rentang versi.

```yaml
filter:
  specVersion: [23, 24]   # Blok indeks dengan specVersion di antara 23 dan 24 (inklusif).
  specVersion: [100]      # Blok indeks dengan specVersion lebih besar dari atau sama dengan 100.
  specVersion: [null, 23] # Blok indeks dengan specVersion kurang dari atau sama dengan 23.
```

## Chain Kustom

### Network Spec

Saat menghubungkan ke parachain Polkadot yang berbeda atau bahkan rantai substrat khusus, Anda harus mengedit bagian [Spesifikasi Jaringan](#network-spec) dari manifes ini.

`genesisHash` harus selalu berupa hash dari blok pertama jaringan kustom. Anda dapat mengambil ini dengan mudah dengan pergi ke [Polkadot JS](https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fkusama.api.onfinality.io%2Fpublic-ws#/explorer/query/0) dan mencari hash di **blok 0** (lihat gambar di bawah).

![Kejadian Hash](/assets/img/genesis-hash.jpg)

Selain itu, Anda perlu memperbarui `endpoint`. Ini mendefinisikan endpoint wss dari blockchain yang akan diindeks - **Ini harus berupa node arsip lengkap**. Anda dapat mengambil titik akhir untuk semua parachains secara gratis dari [OnFinality](https://app.onfinality.io)

### Tipe Chain

Anda dapat mengindeks data dari rantai kustom dengan juga menyertakan jenis rantai dalam manifes.

Kami mendukung jenis tambahan yang digunakan oleh modul waktu proses media, `typesAlias`, `typesBundle`, `typesChain`, dan `typesSpec` juga didukung

Dalam contoh v0.2.0 di bawah ini, `network.chaintypes` menunjuk ke file yang memiliki semua tipe kustom yang disertakan, Ini adalah file chainspec standar yang menyatakan tipe spesifik yang didukung oleh blockchain ini di < 0>.json</code> atau `.yaml`.

<CodeGroup> <CodeGroupItem title="v0.2.0" active> ``` yml jaringan: genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' titik akhir: 'ws://host.kittychain.io/public-ws' tipe rantai: file: ./types.json # Jalur file relatif ke tempat jenis kustom disimpan ... ``` </CodeGroupItem>
<CodeGroupItem title="v0.0.1"> ``` yml ... network: endpoint: "ws://host.kittychain.io/public-ws" types: { "KittyIndex": "u32", "Kitty": "[u8; 16]" } # typesChain: { chain: { Type5: 'example' } } # typesSpec: { spec: { Type6: 'example' } } dataSources: - name: runtime kind: substrate/Runtime startBlock: 1 filter:  #Optional specName: kitty-chain mapping: handlers: - handler: handleKittyBred kind: substrate/CallHandler filter: module: kitties method: breed success: true ``` </CodeGroupItem> </CodeGroup>

## Sumber Data Khusus

Sumber Data Khusus menyediakan fungsionalitas khusus jaringan yang membuat penanganan data menjadi lebih mudah. Mereka bertindak sebagai middleware yang dapat memberikan pemfilteran ekstra dan transformasi data.

Contoh yang baik dari hal ini adalah dukungan EVM, memiliki prosesor sumber data khusus untuk EVM berarti Anda dapat memfilter pada tingkat EVM (misalnya menyaring metode kontrak atau log) dan data diubah menjadi struktur yang mirip dengan ekosistem Ethereum juga sebagai parameter penguraian dengan ABI.

Sumber Data Khusus dapat digunakan dengan sumber data normal.

Berikut adalah daftar sumber data khusus yang didukung:

| Baik                                                 | Penangan yang Didukung                                                                                 | Filter                                | Deskripsi                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| [substrat/Moonbeam](./moonbeam/#data-source-example) | [substrat/MoonbeamEvent](./moonbeam/#moonbeamevent), [substrat/MoonbeamCall](./moonbeam/#moonbeamcall) | Lihat filter di bawah setiap penangan | Memberikan interaksi yang mudah dengan transaksi dan peristiwa EVM di jaringan Moonbeams |

## Filter Jaringan

**Filter jaringan hanya berlaku untuk spesifikasi manifes v0.0.1**.

Biasanya pengguna akan membuat SubQuery dan berharap dapat menggunakannya kembali untuk lingkungan testnet dan mainnet mereka (misalnya Polkadot dan Kusama). Di antara jaringan, berbagai opsi cenderung berbeda (misalnya blok awal indeks). Oleh karena itu, kami mengizinkan pengguna untuk menentukan detail yang berbeda untuk setiap sumber data yang berarti bahwa satu proyek SubQuery masih dapat digunakan di beberapa jaringan.

Pengguna dapat menambahkan `filter` pada `dataSources` untuk memutuskan sumber data mana yang akan dijalankan di setiap jaringan.

Di bawah ini adalah contoh yang menunjukkan sumber data yang berbeda untuk jaringan Polkadot dan Kusama.

<CodeGroup> <CodeGroupItem title="v0.0.1"> ```yaml --- jaringan: titik akhir: 'wss://polkadot.api.onfinality.io/public-ws' #Buat template untuk menghindari redundansi definisi: pemetaan: &pemetaan saya penangan: - handler: handleBlock jenis: substrat/BlockHandler sumber data: - nama: polkadotRuntime jenis: substrat/Waktu Proses filter: #Opsional specName: polkadot mulaiBlok: 1000 pemetaan: *mymapping #gunakan template di sini - nama: kusamaRuntime jenis: substrat/Waktu Proses Saring: specName: kusama mulaiBlok: 12000 pemetaan: *mymapping # dapat digunakan kembali atau diubah ``` </CodeGroupItem>

</CodeGroup>
