# Membuat Proyek SubQuery

Di panduan [mulai cepat](/quickstart/quickstart.md), kami dengan sangat cepat memberikan contoh untuk menjelaskan pada Anda apa itu SubQuery dan bagaimana cara kerjanya. Di sini kita akan melihat lebih dekat alur kerja saat membuat proyek Anda dan file kunci yang akan Anda ikut sertakan.

## Alur Kerja Dasar

Sebagian contoh berikut akan mengasumsikan Anda telah berhasil menginisialisasi paket pemula di bagian [Mulai cepat](../quickstart/quickstart.md). Dari paket pemula itu, kita akan berjalan melewati proses standar untuk menyesuaikan dan mengimplementasikan proyek SubQuery Anda.

1. Inisialisasi proyek Anda menggunakan `subql init PROJECT_NAME`
2. Perbarui file Manifest (`project.yaml`) untuk menyertakan informasi tentang blockchain Anda, dan entitas yang akan Anda petakan - lihat [File Manifest](./manifest.md)
3. Buat entitas GraphQL di skema Anda (`schema.graphql`) yang menentuakn bentuk data yang akan Anda ekstrak dan coba untuk kueri - lihat [Skema GraphQL](./graphql.md)
4. Tambahkan semua fungsi pemetaan (mis `mappingHandlers.ts` yang ingin Anda minta untuk ubah data chainnya ke entitas GraphQL yang sudah Anda tentukan - lihat [Pemetaan](./mapping.md)
5. Hasilkan, bentuk, dan terbitkan kode Anda ke Proyek SubQuery (atau jalankan di node lokal Anda) - lihat [Menjalankan dan Mengkueri Proyek Pemula Anda](./quickstart.md#running-and-querying-your-starter-project) di panduan mulai cepat kami.

## Struktur Direktori

Peta berikut ini memberikan gambaran struktur direktori proyek SubQuery saat perintah `init` berjalan.

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
  L .gitignore
```

Contohnya:

![Struktur direktori SubQuery](/assets/img/subQuery_directory_stucture.png)

## Pembuatan Kode

Kapan pun Anda mengubah entitas GraphQL Anda, Anda harus menghasilkan ulang direktori jenis Anda dengan perintah berikut.

```
yarn codegen
```

Ini akan menciptakan direktori baru (atau memperbarui yang ada)`src/types` yang berisi kelas entitas yang dihasilkan untuk setiap jenis yang telah Anda tentukan sebelumnya di `schema.graphql`. Kelas-kelas ini memberikan pemuatan entitas berjenis aman, membaca dan menuliskan akses ke bidang entitas - lihat lebih banyak tentang proses ini di [Skema GraphQL](./graphql.md).

## Bentuk

Untuk menjalankan Proyek SubQuery Anda di host Node SubQuery secara lokal, pertama-tama Anda perlu membentuk pekerjaan Anda.

Jalankan perintah bentuk dari direktori proyek.

```shell
# Yarn
yarn build

# NPM
npm run-script build
```

## Logging

Metode `console.log` **tidak lagi didukung**. Modul `logger` telah dimasukkan ke dalam jenis, yang berarti kami bisa mendukung logger yang bisa menerima berbagai tingkat logging.

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

Untuk menggunakan `logger.info` atau `logger.warn`, tempatkan barisannya ke file pemetaan Anda.

![logging.info](/assets/img/logging_info.png)

Untuk menggunakan `logger.debug`, langkah tambahan diperlukan. Untuk menggunakan `logger. debug`, langkah tambahan diperlukan.

Jika Anda sedang menjalankan docker container, tambahkan barisan ini ke file `docker-compose.yaml` Anda.

![logging.debug](/assets/img/logging_debug.png)

Anda sekarang akan melihat logging baru di layar terminal.

![logging.debug](/assets/img/subquery_logging.png)
