# File Manifest

File Manifest `project.yaml` bisa dilihat sebagai titik masuk proyek Anda dan menentukan sebagian besar detil tentang bagaimana SubQuery akan mengindeks dan mengubah data chain.

The Manifest can be in either YAML or JSON format. In this document, we will use YAML in all the examples. Below is a standard example of a basic `project.yaml`.

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

Usually the user will create a SubQuery and expect to reuse it for both their testnet and mainnet environments (e.g Polkadot and Kusama). Between networks, various options are likely to be different (e.g. index start block). Therefore, we allow users to define different details for each data source which means that one SubQuery project can still be used across multiple networks.

Pengguna bisa menambahkan `filter` di `dataSources` untuk memutuskan sumber data mana untuk dijalankan di masing-masing jaringan.

Di bawah ini merupakan contoh yang menunjukkan sumber data berbeda untuk jaringan Polkadot dan Kusama.

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

## Filter Pemetaan

Filter pemetaan merupakan sebuah filter yang sangat berguna untuk memutuskan balok, acara, atau ekstrinsik apa yang akan memicu penanganan pemetaan.

Only incoming data that satisfy the filter conditions will be processed by the mapping functions. Mapping filters are optional but are recommended as they significantly reduce the amount of data processed by your SubQuery project and will improve indexing performance.

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
- The `specVersion` filter specifies the spec version range for a substrate block. The following examples describe how to set version ranges.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```

## Chain Kustom

You can index data from custom chains by also including chain types in the `project.yaml`. Declare the specific types supported by this blockchain in `network.types`. We support the additional types used by substrate runtime modules.

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
