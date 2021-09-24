# Sandbox

Dalam skenario penggunaan yang kami bayangkan, node SubQuery biasanya dijalankan oleh host tepercaya, dan kode proyek SubQuery yang dikirimkan oleh pengguna ke node yang tidak sepenuhnya dapat dipercaya.

Some malicious code is likely to attack the host or even compromise it, and cause damage to the data of other projects in the same host. Therefore, we use the [VM2](https://www.npmjs.com/package/vm2) sandbox secured mechanism to reduce risks. This:

- Menjalankan kode tidak tepercaya dengan aman dalam konteks yang terisolasi dan kode berbahaya tidak akan mengakses jaringan dan sistem file host kecuali melalui interface terbuka yang kami masukkan ke dalam sandbox.

- Meminta metode dengan aman dan bertukar data dan panggilan balik antar sandbox.

- Kebal terhadap banyak metode serangan yang diketahui.


## Larangan

- Untuk membatasi akses ke modul bawaan tertentu, hanya `nyatakan`, `buffer`, `crypto`,`util` dan `jalur` dimasukkan dalam whitelist.

- Kami mendukung [modul pihak ketiga](../create/mapping.md#third-party-libraries) yang ditulis di **CommonJS** dan **hybrid** library seperti `@polkadot/*` yang menggunakan ESM sebagai default.

- Semua modul yang menggunakan `HTTP` dan `WebSocket` dilarang.
