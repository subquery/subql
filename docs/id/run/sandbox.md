# Sandbox

Dalam skenario penggunaan yang kami bayangkan, node SubQuery biasanya dijalankan oleh host tepercaya, dan kode proyek SubQuery yang dikirimkan oleh pengguna ke node yang tidak sepenuhnya dapat dipercaya.

Beberapa kode berbahaya kemungkinan akan menyerang host atau bahkan membahayakannya, dan menyebabkan kerusakan pada data proyek lain di host yang sama. Oleh karena itu, kami menggunakan mekanisme keamanan sandbox [VM2](https://www.npmjs.com/package/vm2) untuk mengurangi risiko. Yaitu:

- Menjalankan kode tidak tepercaya dengan aman dalam konteks yang terisolasi dan kode berbahaya tidak akan mengakses jaringan dan sistem file host kecuali melalui interface terbuka yang kami masukkan ke dalam sandbox.

- Meminta metode dengan aman dan bertukar data dan panggilan balik antar sandbox.

- Kebal terhadap banyak metode serangan yang diketahui.

## Larangan

- Untuk membatasi akses ke modul bawaan tertentu, hanya `nyatakan`, `buffer`, `crypto`,`util` dan ` jalur` dimasukkan dalam whitelist.

- Kami mendukung [modul pihak ketiga](../create/mapping.md#third-party-libraries) yang ditulis di **CommonJS** dan **hybrid** library seperti `@polkadot/*` yang menggunakan ESM sebagai default.

- Semua modul yang menggunakan `HTTP` dan `WebSocket` dilarang.
