# Tutorial & Contoh

In the [quick start](/quickstart/quickstart.md) guide, we very quickly ran through an example to give you a taste of what SubQuery is and how it works. Here we'll take a closer look at the workflow when creating your project and the key files you'll be working with.

## Contoh SubQuery
Some of the following examples will assume you have successfully initialized the starter package in the [Quick start](../quickstart/quickstart.md) section. From that starter package, we'll walk through the standard process to customise and implement your SubQuery project.

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

This will create a new directory (or update the existing) `src/types` which contain generated entity classes for each type you have defined previously in `schema.graphql`. These classes provide type-safe entity loading, read and write access to entity fields - see more about this process in [the GraphQL Schema](./graphql.md).

## Bentuk

Untuk menjalankan Proyek SubQuery Anda di host Node SubQuery secara lokal, pertama-tama Anda perlu membentuk pekerjaan Anda.

Jalankan perintah bentuk dari direktori proyek.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

## Logging

The `console.log` method is **no longer supported**. Instead, a `logger` module has been injected in the types, which means we can support a logger that can accept various logging levels.

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

Untuk menggunakan `logger.info` atau `logger.warn`, tempatkan barisannya ke file pemetaan Anda.

![logging.info](/assets/img/logging_info.png)

To use `logger.debug`, an additional step is required. Add `--log-level=debug` to your command line.

Jika Anda sedang menjalankan docker container, tambahkan barisan ini ke file `docker-compose.yaml` Anda.

![logging.debug](/assets/img/logging_debug.png)

Anda sekarang akan melihat logging baru di layar terminal.

![logging.debug](/assets/img/subquery_logging.png)
