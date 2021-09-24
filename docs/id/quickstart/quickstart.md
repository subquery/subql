# Panduan Memulai Cepat

Dalam panduan Mulai Cepat ini, kita akan membuat proyek awal sederhana yang dapat Anda gunakan sebagai kerangka kerja untuk mengembangkan Proyek SubQuery Anda sendiri.

Di akhir panduan ini, Anda akan memiliki proyek SubQuery yang berjalan pada node SubQuery dengan titik akhir GraphQL tempat dimana Anda dapat membuat kueri data.

Jika Anda belum melakukannya, sebaiknya Anda membiasakan diri dengan [terminologi](../#terminology) yang digunakan di SubQuery.

## Persiapan

### Lingkungan Pengembangan Lokal

- [Naskah](https://www.typescriptlang.org/) diperlukan untuk mengkompilasi proyek dan menentukan tipe.
- Baik CLI SubQuery dan Project yang dihasilkan memiliki dependensi dan memerlukan versi modern [Node](https://nodejs.org/en/).
- Node SubQuery membutuhkan Docker

### Pasang CLI SubQuery

Pasang SubQuery CLI secara global di terminal Anda dengan menggunakan NPM:

```shell
# NPM
npm install -g @subql/cli
```

Harap dicatat bahwa kami **JANGAN** mendorong penggunaan `global benang` karena manajemen ketergantungannya yang buruk yang dapat menyebabkan kesalahan di masa mendatang.

Kemudian Anda dapat menjalankan bantuan untuk melihat perintah dan penggunaan yang tersedia yang telah disediakan oleh CLI

```shell
bantuan subql
```

## Inisialisasi Proyek SubQuery Pemula

Di dalam direktori tempat Anda ingin membuat proyek SubQuery, cukup ganti `NAMA_PROYEK` dengan milik Anda dan jalankan perintah:

```shell
subql init --starter PROJECT_NAME
```

Anda akan ditanya pertanyaan tertentu saat proyek SubQuery diinisialisasi:

- Repositori Git (Pilihan): Berikan URL Git ke repo tempat proyek SubQuery ini akan dihosting (saat dihosting di Penjelajah SubQuery)
- RPC endpoint (Required): Provide a wss URL to a running RPC endpoint that will be used by default for this project. You can quickly access public endpoints for different Polkadot networks or even create your own private dedicated node using [OnFinality](https://app.onfinality.io) or just use the default Polkadot endpoint.
- Penulis (Diperlukan): Masukkan pemilik proyek SubQuery ini di sini
- Deskripsi (Pilihan): Anda dapat memberikan paragraf singkat tentang proyek Anda yang menjelaskan data apa yang ada di dalamnya dan apa yang dapat dilakukan pengguna dengannya
- Versi (Diperlukan): Masukkan nomor versi khusus atau gunakan default (`1.0.0`)
- Lisensi (Diperlukan): Berikan lisensi perangkat lunak untuk proyek ini atau terima default (`Apache-2.0`)

After the initialisation process is complete, you should see a folder with your project name has been created inside the directory. The contents of this directoy should be identical to what's listed in the [Directory Structure](../create/introduction.md#directory-structure).

Terakhir, di bawah direktori proyek, jalankan perintah berikut untuk memasang dependensi proyek baru.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell cd PROJECT_NAME yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash cd PROJECT_NAME npm install ``` </CodeGroupItem> </CodeGroup>

## Configure and Build the Starter Project

In the starter package that you just initialised, we have provided a standard configuration for your new project. You will mainly be working on the following files:

- The Manifest in `project.yaml`
- The GraphQL Schema in `schema.graphql`
- The Mapping functions in `src/mappings/` directory

For more information on how to write your own SubQuery, check out our documentation under [Create a Project](../create/introduction.md)

### GraphQL Model Generation

In order to [index](../run/run.md) your SubQuery project, you must first generate the required GraphQL models that you have defined in your GraphQL Schema file (`schema.graphql`). Run this command in the root of the project directory.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

You'll find the generated models in the `/src/types/models` directory

## Build the Project

In order run your SubQuery Project on a locally hosted SubQuery Node, you need to build your work.

Run the build command from the project's root directory.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

## Running and Querying your Starter Project

Although you can quickly publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network), the easiest way to run SubQuery nodes locally is in a Docker container, if you don't already have Docker you can install it from [docker.com](https://docs.docker.com/get-docker/).

[_Skip this and publish your new project to SubQuery Projects_](../publish/publish.md)

### Run your SubQuery Project

All configuration that controls how a SubQuery node is run is defined in this `docker-compose.yml` file. For a new project that has been just initalised you won't need to change anything here, but you can read more about the file and the settings in our [Run a Project section](../run/run.md)

Under the project directory run following command:

```shell
docker-compose pull && docker-compose up
```

It may take some time to download the required packages ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query), and Postgres) for the first time but soon you'll see a running SubQuery node.

### Query your Project

Open your browser and head to [http://localhost:3000](http://localhost:3000).

You should see a GraphQL playground is showing in the explorer and the schemas that are ready to query. On the top right of the playground, you'll find a _Docs_ button that will open a documentation draw. This documentation is automatically generated and helps you find what entities and methods you can query.

For a new SubQuery starter project, you can try the following query to get a taste of how it works or [learn more about the GraphQL Query language](../query/graphql.md).

```graphql
{
  query {
    starterEntities(first: 10) {
      nodes {
        field1
        field2
        field3
      }
    }
  }
}
```

## Next Steps

Congratulations, you now have a locally running SubQuery project that accepts GraphQL API requests for sample data. In the next guide, we'll show you how to publish your new project to [SubQuery Projects](https://project.subquery.network) and query it using our [Explorer](https://explorer.subquery.network)

[Publish your new project to SubQuery Projects](../publish/publish.md)
