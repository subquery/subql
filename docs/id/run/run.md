# Menjalankan SubQuery Secara Lokal

Panduan ini bekerja melalui cara menjalankan node SubQuery lokal pada infrastruktur Anda, yang mencakup pengindeks dan layanan kueri. Tidak ingin khawatir saat menjalankan infrastruktur SubQuery Anda sendiri? SubQuery menyediakan [layanan hosting yang terkelola](https://explorer.subquery.network) kepada komunitas secara gratis. [Ikuti panduan penerbitan kami](../publish/publish.md) untuk melihat bagaimana Anda dapat mengunggah proyek Anda ke [Proyek SubQuery](https://project.subquery.network).

## Gunakan Docker

Solusi alternatif adalah menjalankan <strong>Docker Container</strong>, yang ditentukan oleh file `docker-compose.yml`. Untuk proyek baru yang baru saja diinisialisasi, Anda tidak perlu mengubah apa pun di sini.

Di bawah direktori proyek jalankan perintah berikut:

```shell
docker-compose pull && docker-compose up
```

Mungkin perlu beberapa saat untuk mengunduh paket yang diperlukan ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query), dan Postgres) untuk pertama kalinya, tetapi segera Anda akan melihat Node subkueri.

## Menjalankan Pengindeks (subql/node)

Persyaratan:

- [Postgres](https://www.postgresql.org/) database (versi 12 atau lebih tinggi). Ketika [Node SubQuery](#start-a-local-subquery-node) mengindeks blockchain, data yang diekstrak akan disimpan dalam instance database eksternal.

Node SubQuery adalah implementasi yang mengekstrak data blockchain berbasis substrat per proyek SubQuery dan menyimpannya ke dalam database Postgres.

### Instalasi

```shell
# NPM
npm install -g @subql/node
```

Harap diperhatikan bahwa kami **TIDAK** mendukung penggunaan `yarn global` karena manajemen ketergantungannya yang buruk yang dapat menyebabkan error di masa mendatang.

Setelah terinstal, Anda dapat memulai node dengan perintah berikut:

```shell
subql-node <command>
```

### Perintah Utama

Perintah berikut akan membantu Anda menyelesaikan konfigurasi node SubQuery dan memulai proses pengindeksan. Untuk mengetahui lebih lanjut, Anda dapat menjalankan perintah `--help`.

#### Arahkan ke jalur proyek lokal

```
subql-node -f your-project-path
```

#### Gunakan Kamus

Menggunakan kamus full chain dapat mempercepat pemrosesan proyek SubQuery selama pengujian atau selama indeks pertama Anda secara drastis. Dalam beberapa kasus, kami telah melihat peningkatan kinerja pengindeksan hingga 10x dibanding sebelumnya.

Kamus full chain dapat melakukan pra-indeks lokasi semua peristiwa dan ekstrinsik dalam chain tertentu dan memungkinkan layanan node Anda untuk melompat ke lokasi yang relevan saat melakukan proses indeks daripada memeriksa setiap blok.

Anda dapat menambahkan titik akhir kamus di file `project.yaml` Anda (lihat [File Manifes](../create/manifest.md)), atau tentukan saat dijalankan menggunakan perintah berikut:

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

#### Hubungkan ke database

```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
subql-node -f your-project-path
```

Bergantung pada konfigurasi database Postgres Anda (misalnya kata sandi database yang berbeda), harap pastikan juga bahwa pengindeks (`subql/node`) dan layanan kueri (`subql/query`) dapat membuat koneksi ke sana.

#### Tentukan file konfigurasi

```
subql-node -c your-project-config.yml
```

Ini akan mengarahkan node kueri ke file konfigurasi yang bisa dalam format YAML atau JSON. Lihat contoh di bawah ini.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Ubah ukuran batch pengambilan blok

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

Saat pengindeks pertama kali mengindeks chain, mengambil blok tunggal akan menurunkan kinerja secara signifikan. Meningkatkan ukuran batch untuk menyesuaikan jumlah blok yang diambil akan mengurangi waktu pemrosesan secara keseluruhan. Ukuran batch default saat ini adalah 100.

#### Mode lokal

```
subql-node -f your-project-path --local
```

Untuk tujuan debugging, pengguna dapat menjalankan node dalam mode lokal. Beralih ke model lokal akan membuat tabel Postgres dalam skema `publik` default.

Jika mode lokal tidak digunakan, skema Postgres baru dengan `subquery_` awal dan tabel proyek yang sesuai akan dibuat.

## Menjalankan Layanan Kueri (subql/query)

### Instalasi

```shell
# NPM
npm install -g @subql/query
```

Harap perhatikan bahwa kami **TIDAK** mendukung penggunaan `yarn global` karena manajemen ketergantungannya yang buruk yang dapat menyebabkan error di masa mendatang.

### Menjalankan layanan Kueri

``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Pastikan nama proyek sama dengan nama proyek saat Anda [menginisialisasi proyek](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Periksa juga variabel lingkungan sudah benar.

Setelah menjalankan layanan subql-query dengan sukses, buka browser Anda dan buka `http://localhost:3000`. Anda akan melihat playground GraphQL muncul di Explorer dan skema yang siap untuk kueri.
