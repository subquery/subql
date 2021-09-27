## Terminologi

- SubQuery Project (_tempat sihirnya terjadi_): Sebuah definisi ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) tentang bagaimana SubQuery Node perlu melintasi dan menyatukan jaringan proyek dan bagaimana datanya ditransformasi dan disimpan untuk menghasilkan query GraphQL yang berguna
- SubQuery Node (_tempat kerjanya dilakukan_): Sebuah paket ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) yang akan menerima definisi proyek SubQuery, dan menjalankan node yang secara konstan mengindeks jaringan yang terhubung ke basis data
- SubQuery Query Service (_tempat kami mendapatkan datanya_): Sebuah paket ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) yang berinteraksi dengan GraphQL API dari node SubQuery yang dikeluarkan untuk melakukan query dan melihat data yang sudah diindeks
- GraphQL (_bagaimana kami melakukan query data_): Bahasa Query untuk API yang secara khusus diperuntukkan data berbasis grafik yang fleksibel - lihat [graphql.org](https://graphql.org/learn/)
