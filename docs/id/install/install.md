# Memasang SubQuery

Ada berbagai komponen yang diperlukan saat membuat proyek SubQuery. Komponen [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) diperlukan untuk menjalankan pengindeks. Pustaka [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) diperlukan untuk menghasilkan kueri.

## Pasang @subql/cli

Pustaka [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) membantu membuat kerangka kerja proyek atau perancah yang berarti Anda tidak harus memulai dari awal.

Pasang SubQuery CLI secara global di terminal Anda dengan menggunakan Yarn atau NPM:

```shell
# Yarn
yarn global add @subql/cli

# NPM
npm install -g @subql/cli
```

Anda kemudian dapat menjalankan bantuan untuk melihat perintah dan penggunaan yang tersedia yang disediakan oleh CLI:

```shell
bantuan subql
```

## Pasang @subql/node

Node SubQuery adalah implementasi yang mengekstrak data blockchain berbasis substrat per proyek SubQuery dan menyimpannya ke dalam database Postgres.

Pasang node SubQuery secara global di terminal Anda dengan menggunakan Yarn atau NPM:

```shell
# Yarn
yarn global add @subql/node

# NPM
npm install -g @subql/node
```

Setelah terpasang, Anda dapat memulai node dengan:

```shell
subql-simpul <command>
```

> Catatan: Jika Anda menggunakan Docker atau menyelenggarakan proyek Anda di Proyek SubQuery, Anda dapat melewati langkah ini. Ini karena node SubQuery sudah disediakan di wadah Docker dan penyelenggaraan infrastruktur.

## Pasang @subql/query

Pustaka kueri SubQuery menyediakan layanan yang memungkinkan Anda membuat kueri proyek Anda di lingkungan "taman bermain" melalui browser Anda.

Pasang kueri SubQuery secara global di terminal Anda dengan menggunakan Yarn atau NPM:

```shell
# Yarn
yarn global add @subql/query

# NPM
npm install -g @subql/query
```

> Catatan: Jika Anda menggunakan Docker atau menyelenggarakan proyek Anda di Proyek SubQuery, Anda juga dapat melewati langkah ini. Ini karena node SubQuery sudah disediakan di wadah Docker dan penyelenggaraan infrastruktur.
