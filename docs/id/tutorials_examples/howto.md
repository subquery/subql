# Tutorial

## Bagaimana cara mulai di tinggi block berbeda?

### Panduan video

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Pengenalan

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

### Kenapa tidak mulai dari nol?

Alasan utamanya adalah karena ini bisa mengurangi waktu sinkronisasi blockchain. Artinya jika anda hanya tertarik pada transaksi di 3 bulan terakhir, anda bisa hanya mengsinkronisasi hasil 3 bulan terakhir, dengan begitu mengurangi waktu menunggu dan anda bisa mulai pengembangan lebih cepat.

### Apa kekurangan tidak memulai dari nol?

Kekurangan paling jelas adalah anda tidak akan bisa melakukan query data di blockchain untuk block yang tidak anda miliki.

### Bagaimana cara mengetahui tinggi blockchain saat ini?

Jika menggunakan jaringan Polkadot, anda bisa mengunjungi [https://polkascan.io/](https://polkascan.io/), pilih jaringannya, dan lihat "Finalised Block".

### Apa saya harus membangun ulang atau codegen?

Tidak. Karena anda memodifikasi file project.yaml, yang merupakan file konfigurasi, anda tidak perlu membangun ulang atau menghasilkan lagi kode typescript-nya.

## Bagaimana cara mengubah ukuran blockchain fetching batch?

### Panduan video

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Pengenalan

Ukuran batch default adalah 100, tapi ini bisa diubah menggunakan perintah ekstra `--batch-size=xx`.

Anda perlu memasukkannya ke garis perintah sebagai extra flag atau jika menggunakan Docker, modifikasi file docker-compose.yml dengan:

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    restart: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - ./:/app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

Contoh ini mengatur ukuran batch (batch size) ke 50.

### Kenapa mengubah ukuran batch?

Menggunakan ukuran batch yang lebih kecil bisa mengurangi penggunaan memori dan tidak membuat pengguna menunggu untuk query yang besar. Dengan kata lain, aplikasi anda bisa jadi lebih responsif. Namun, akan ada lebih banyak panggilan API yang dilakukan jadi jika anda dikenakan biaya dengan basis I/O atau jika anda memiliki batasan API di chain anda, ini bisa menjadi sebuah kekurangan.