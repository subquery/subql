# Dukungan Moonbeam EVM

Kami menyediakan prosesor sumber data khusus untuk EVM Moonbeam dan Moonriver. Ini menawarkan cara sederhana untuk memfilter dan mengindeks aktivitas EVM dan Substrat di jaringan Moonbeam dalam satu proyek SubQuery.

Jaringan yang didukung:

| Nama Jaringan  | Titik akhir soket web                              | Titik Akhir Kamus                                                    |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _Segera akan datang_                               | _Segera akan datang_                                                 |
| Moonriver      | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**Anda juga dapat merujuk ke [contoh proyek dasar Moonriver EVM](https://github.com/subquery/tutorials-moonriver-evm-starter) dengan event dan pengendali panggilan.** Proyek ini juga dihosting secara langsung di SubQuery Explorer [di sini](https://explorer.subquery.network/subquery/subquery/moonriver-evm-starter-project) .

## Mulai

1. Tambahkan sumber data khusus sebagai dependensi `yarn add @subql/contract-processors`
2. Tambahkan sumber data khusus seperti yang dijelaskan di bawah
3. Tambahkan penangan untuk sumber data khusus ke kode Anda

## Spesifikasi Sumber Data

| Bidang            | Tipe                                                           | Yang dibutuhkan | Deskripsi                            |
| ----------------- | -------------------------------------------------------------- | --------------- | ------------------------------------ |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Yes             | Referensi file ke kode pemroses data |
| processor.options | [ProcessorOptions](#processor-options)                         | No              | Opsi khusus untuk Prosesor Moonbeam  |
| assets            | `{ [key: String]: { file: String }}`                           | No              | Objek file aset eksternal            |

### Opsi Prosesor

| Bidang  | Tipe             | Yang Dibutuhkan | Deskripsi                                                                                             |
| ------- | ---------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| abi     | String           | No              | ABI yang digunakan oleh prosesor untuk mengurai argumen. HARUS berupa kunci `aset`                    |
| address | String or `null` | No              | Alamat kontrak tempat acara atau panggilan dilakukan. `null` akan merekam panggilan pembuatan kontrak |

## MoonbeamCall

Bekerja dengan cara yang sama seperti [substrat/CallHandler](../create/mapping/#call-handler) kecuali dengan argumen penangan yang berbeda dan perubahan pemfilteran kecil.

| Bidang | Tipe                              | Dibutuhkan | Deskripsi                                            |
| ------ | --------------------------------- | ---------- | ---------------------------------------------------- |
| kind   | 'substrate/MoonbeamCall'          | Yes        | Menentukan bahwa ini adalah penangan jenis Panggilan |
| filter | [Filter Panggilan](#call-filters) | No         | Filter sumber data untuk dieksekusi                  |

### Filter Panggilan

| Bidang | Tipe   | Contoh                                        | Deskripsi                                                                                                                                                                 |
| ------ | ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fungsi | String | 0x095ea7b3, approve(address to,uint256 value) | String [Function Signature](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) atau fungsi `sighash` untuk memfilter fungsi yang dipanggil pada kontrak |
| from   | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b    | Alamat Ethereum yang mengirim transaksi                                                                                                                                   |

### Penangan

Tidak seperti handler biasa, Anda tidak akan mendapatkan `SubstrateExtrinsic` sebagai parameter, melainkan Anda akan mendapatkan `MoonbeamCall` yang didasarkan pada jenis [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) Eter.

Perubahan dari jenis `TransactionResponse`:

- Tidak memiliki properti `menunggu` dan `konfirmasi`
- Properti `sukses` ditambahkan untuk mengetahui apakah transaksi berhasil
- `args` ditambahkan jika bidang `abi` disediakan dan argumen dapat berhasil diuraikan

## MoonbeamEvent

Bekerja dengan cara yang sama seperti [substrate/EventHandler](../create/mapping/#event-handler) kecuali dengan argumen handler yang berbeda dan perubahan pemfilteran kecil.

| Bidang | Tipe                               | Dibutuhkan | Deskripsi                                       |
| ------ | ---------------------------------- | ---------- | ----------------------------------------------- |
| jenis  | 'substrate/MoonbeamEvent'          | Ya         | Menentukan bahwa ini adalah penangan tipe Acara |
| Filter | [Filter Peristiwa](#event-filters) | Tidak      | Menentukan bahwa ini adalah penangan tipe Acara |

### Filter Peristiwa

| Bidang | Tipe         | Contoh                                                          | Deskripsi                                                                                                                                            |
| ------ | ------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Topik  | String array | Transfer (alamat diindeks dari, alamat diindeks ke, nilai u256) | Filter topik mengikuti filter log Ethereum JSON-PRC, dokumentasi selengkapnya dapat ditemukan [di sini](https://docs.ethers.io/v5/concepts/events/). |

<b>Catatan tentang topik:</b>
Ada beberapa peningkatan dari filter log dasar:

- Topik tidak perlu diisi 0
- String [Fragmen Peristiwa](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) dapat diberikan dan secara otomatis dikonversi ke id-nya

### Penanganan

Tidak seperti handler biasa, Anda tidak akan mendapatkan `SubstrateEvent` sebagai parameter, tetapi Anda akan mendapatkan `MoonbeamEvent` yang didasarkan pada jenis [Log](https://docs.ethers.io/v5/api/providers/types/#providers-Log) Eter.

Perubahan dari jenis `Log`:

- `args` ditambahkan jika bidang `abi` disediakan dan argumen dapat berhasil diuraikan

## Contoh Sumber Data

Ini adalah ekstrak dari file manifes `project.yaml`.

```yaml
sumber data:
  - jenis: substrat/Moonbeam
    mulaiBlok: 752073
    prosesor:
      file: './node_modules/@subql/contract-processors/dist/moonbeam.js'
      pilihan:
        # Harus menjadi kunci aset
        abi: erc20
        # Alamat kontrak (atau penerima jika transfer) untuk difilter, jika `null` seharusnya untuk pembuatan kontrak
        alamat: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
    aktiva:
      erc20:
        file: './erc20.abi.json'
    pemetaan:
      file: './dist/index.js'
      penangan:
        - handler: handleMoonriverEvent
          jenis: substrat/MoonbeamEvent
          Saring:
            topik:
              - Transfer (alamat diindeks dari, alamat diindeks ke, nilai u256)
        - handler: handleMoonriverCall
          jenis: substrat/MoonbeamCall
          Saring:
            ## Fungsi dapat berupa fragmen fungsi atau tanda tangan
            # fungsi: '0x095ea7b3'
            # fungsi: '0x7ff36ab50000000000000000000000000000000000000000000000000000000000'
            # fungsi: menyetujui (alamat, uint256)
            fungsi: menyetujui (alamat ke, nilai uint256)
            dari: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
```

## Batasan yang Diketahui

- Saat ini tidak ada cara untuk menanyakan status EVM dalam penangan
- Tidak ada cara untuk mendapatkan tanda terima transaksi dengan penangan panggilan
- Properti `blockHash` saat ini tidak ditentukan, properti `blockNumber` dapat digunakan sebagai gantinya
