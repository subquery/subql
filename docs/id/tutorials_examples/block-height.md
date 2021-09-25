# Bagaimana cara mulai di tinggi block berbeda?

## Panduan video

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pengenalan

Secara otomatis, semua proyek starter memulai sinkronisasi blockchain dari block genesis. Dengan kata lain, dari block 1. Untuk blockchain besar, ini biasanya membutuhkan beberapa hari atau bahkan minggu untuk sepenuhnya sinkronisasi.

Untuk mulai sinkronisasi node SubQuery dari tinggi bukan-nol, yang perlu dilakukan hanyalah memodifikasi file project.yaml dan mengubah kunci startBlock.

Berikut adalah file project.yaml di mana block mulainya sudah diatur ke 1.000.000

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

## Kenapa tidak mulai dari nol?

Alasan utamanya adalah karena ini bisa mengurangi waktu sinkronisasi blockchain. Artinya jika anda hanya tertarik pada transaksi di 3 bulan terakhir, anda bisa hanya mengsinkronisasi hasil 3 bulan terakhir, dengan begitu mengurangi waktu menunggu dan anda bisa mulai pengembangan lebih cepat.

## Apa kekurangan tidak memulai dari nol?

Kekurangan paling jelas adalah anda tidak akan bisa melakukan query data di blockchain untuk block yang tidak anda miliki.

## Bagaimana cara mengetahui tinggi blockchain saat ini?

Jika menggunakan jaringan Polkadot, anda bisa mengunjungi [https://polkascan.io/](https://polkascan.io/), pilih jaringannya, dan lihat "Finalised Block".

## Apa saya harus membangun ulang atau codegen?

Tidak. Karena anda memodifikasi file project.yaml, yang merupakan file konfigurasi, anda tidak perlu membangun ulang atau menghasilkan lagi kode typescript-nya.
