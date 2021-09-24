# File Manifest

File Manifest `project.yaml` bisa dilihat sebagai titik masuk proyek Anda dan menentukan sebagian besar detil tentang bagaimana SubQuery akan mengindeks dan mengubah data chain.

Manifest bisa dalam format YAML atau JSON. Dalam dokumen ini, kita akan menggunakan YAML di semua contoh. Di bawah ini merupakan contoh standar `project.yaml` standar.

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
    # Secara opsional memberikan endpoint HTTP kamus chain lengkap untuk mempercepat pemrosesan
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
          filter: #Filter opsional tetapi disarankan untuk mempercepat pemrosesan acara
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network.endpoint` menentukan endpoint wss atau ws blockchain untuk diindeks - **Harus merupakan node arsip lengkap**.
- `network.dictionary` secara opsional memberikan endpoint HTTP kamus chain lengkap untuk mempercepat pemrosesan - lihat [Menjalankan Pengindeks](../run/run.md#using-a-dictionary)
- `dataSources` menentukan data yang akan difilter dan diekstrak dan lokasi penanganan fungsi pemetaan untuk transformasi data untuk diaplikasikan.
  - `kind` hanya mendukung `substrate/Runtime` untuk sekarang.
  - `startBlock` menjelaskan tinggi balok untuk mulai diindeks.
  - `filter` akan memfilter sumber data untuk berjalan pada nama spek endpoint jaringan, lihat [filter jaringan](#network-filters)
  - `mapping.handlers` akan menuliskan semua [fungsi pemetaan](./mapping.md) dan jenis penanganannya yang berkaitan, dengan [filter pemetaan](#mapping-filters) tambahan.

## Filter Jaringan

Biasanya pengguna akan membuat SubQuery dan berharap untuk menggunakannya kembali untuk testnet dan mainnetnya (misalnya Polkadot dan Kusama). Antara jaringan, berbagai pilihan cenderung berbeda (misalnya balok mulai indeks). Dengan demikian, kami mengizinkan pengguna untuk menentukan detil berbeda untuk masing-masing sumber data yang berarti bahwa satu proyek SubQuery masih bisa digunakan di beberapa jaringan berbeda.

Pengguna bisa menambahkan `filter` di `dataSources` untuk memutuskan sumber data mana untuk dijalankan di masing-masing jaringan.

Di bawah ini merupakan contoh yang menunjukkan sumber data berbeda untuk jaringan Polkadot dan Kusama.

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Buat template untuk menghindari kelebihan
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
    mapping: *mymapping #gunakan template di sini
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # bisa digunakan ulang atau diganti
```

## Filter Pemetaan

Filter pemetaan merupakan sebuah filter yang sangat berguna untuk memutuskan balok, acara, atau ekstrinsik apa yang akan memicu penanganan pemetaan.

Hanya data masuk yang memenuhi ketentuan filter yang akan diproses oleh fungsi pemetaan. Filter pemetaan opsional tetapi disarankan karena mengurangi jumlah data yang diproses oleh proyek SubQuery Anda secara signifikan dan akan meningkatkan performa pengindeksan.

```yaml
#Contoh filter dari callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

Tabel berikut menjelaskan filter didukung oleh penanganan berbeda.

| Penanganan                                 | Filter yang didukung         |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |


-  Filter modul dan metode didukung di chain apa pun yang berbasis substrat.
- Filter `success` membawa nilai boolean dan bisa digunakan untuk memfilter ekstrinsik berdasarkan status kesuksesannya.
- Filter `specVersion` menentukan kisaran versi spek untuk balok substrat. Contoh berikut ini menjelaskan bagaimana cara mengatur kisaran versi.

```yaml
filter:
  specVersion: [23, 24]   #Balok indeks dengan specVersion antara 23 dan 24 (inklusif).
  specVersion: [100]      #Balok indeks dengan specVersion lebih besar dari atau sama dengan 100.
  specVersion: [null, 23] #Balok indeks dengan specVersion kurang dari atau sama dengan 23.
```

## Chain Kustom

Anda bisa mengindeks data dari chain kustom dengan juga menyertakan indeks chain di `project.yaml`. Nyatakan jenis spesifik yang didukung oleh blockchain ini ini `network.types`. Kami mendukung jenis tambahan yang digunakan oleh modul runtime substrat.

`typesAlias`, `typesBundle`, `typesChain`, and `typesSpec` juga didukung.

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
