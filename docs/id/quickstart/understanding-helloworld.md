# Halo Dunia

Dalam [panduan memulai cepat Halo Dunia](helloworld-localhost.md), kami menjalankan beberapa perintah sederhana dan dengan sangat cepat mendapatkan contoh dan menjalankannya. Ini memungkinkan Anda untuk memastikan bahwa Anda memiliki semua prasyarat dan dapat menggunakan taman bermain lokal untuk membuat kueri sederhana guna mendapatkan data pertama Anda dari SubQuery. Di sini, kita melihat lebih dekat apa arti semua perintah itu.

## subql init

Perintah pertama yang kami jalankan adalah `subql init --starter subqlHelloWorld`.

Ini melakukan pekerjaan berat dan membuat banyak file untuk Anda. Seperti disebutkan dalam [dokumentasi resmi](quickstart.md#configure-and-build-the-starter-project), Anda pastinya akan mengerjakan file-file berikut:

- Manifes di `project.yaml`
- Skema GraphQL di `schema.graphql`
- Fungsi Pemetaan di direktori `src/mappings/`

![file subql kunci](/assets/img/main_subql_files.png)

File-file ini adalah inti dari semua yang kita lakukan. Karena itu, kami akan mendedikasikan lebih banyak waktu untuk file-file ini di artikel lain. Untuk saat ini, ketahuilah bahwa skema berisi deskripsi data yang dapat diminta pengguna dari SubQuery API, file yaml proyek yang berisi parameter tipe "konfigurasi" dan tentu saja mappingHandlers yang berisi Naskah yang mana berisi fungsi yang mengubah data.

## pemasangan yarn

Hal berikutnya yang kami lakukan adalah `yarn instal`. `npm install` dapat digunakan juga.

> Pelajaran sejarah singkat. Node Package Manager atau npm awalnya dirilis pada tahun 2010 dan merupakan manajer paket yang sangat populer di kalangan pengembang JavaScript. Ini adalah paket default yang dipasang secara otomatis setiap kali Anda memasang Node.js di sistem Anda. Yarn awalnya dirilis oleh Facebook pada tahun 2016 dengan maksud untuk mengatasi beberapa kekurangan kinerja dan keamanan bekerja dengan npm (pada waktu itu).

Apa yang dilakukan yarn adalah melihat file `package.json` dan mengunduh berbagai dependensi lainnya. Melihat file `package.json`, sepertinya tidak ada banyak dependensi, tetapi ketika Anda menjalankan perintah, Anda akan melihat bahwa 18.983 file ditambahkan. Ini karena setiap dependensi juga akan memiliki dependensinya sendiri.

![file subql kunci](/assets/img/dependencies.png)

## kodegen yarn

Kemudian kita menjalankan `codegen yarn` atau `npm run-script codegen`. Apa yang dilakukan adalah mengambil skema GraphQL (dalam `schema.graphql`) dan menghasilkan file model TypeScript terkait (Oleh karena itu file output akan memiliki ekstensi .ts). Anda tidak boleh mengubah file yang dihasilkan, cukup ubah file `schema.graphql` sumber.

![file subql kunci](/assets/img/typescript.png)

## pembuatan yarn

`yarn build` atau `npm run-script build` kemudian dieksekusi. Hal Ini pasti akrab bagi programmer berpengalaman. Itu membuat folder distribusi yang melakukan hal-hal seperti pengoptimalan kode yang mempersiapkan penyebaran.

![file subql kunci](/assets/img/distribution_folder.png)

## docker-compose

Langkah terakhir adalah perintah docker gabungan `docker-compose pull && docker-compose up` (dapat dijalankan secara terpisah juga). Perintah `pull` mengambil semua gambar yang diperlukan dari Docker Hub dan perintah `naik` memulai container.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

Saat kontainer dimulai, Anda akan melihat terminal mengeluarkan banyak teks yang menunjukkan status node dan mesin GraphQL. Saat itulah Anda melihat:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

anda tahu bahwa node SubQuery telah disinkronkan.

## Ringkasan

Sekarang setelah Anda memiliki wawasan tentang apa yang terjadi di balik selimut, pertanyaannya adalah mau kemana mana setelah dari sini? Jika Anda merasa percaya diri, Anda dapat langsung mempelajari cara [membuat proyek](../create/introduction.md) dan mempelajari lebih lanjut tentang tiga file utama. File manifes, skema GraphQL, dan file pemetaan.

Jika tidak, lanjutkan ke bagian tutorial kami di mana kami dapat menjalankan contoh Halo Dunia ini pada infrastruktur yang dihosting SubQuery, kami akan memodifikasi blok awal, dan kami akan menyelam lebih dalam di dalam menjalankan proyek SubQuery dengan menjalankan dan proyek sumber terbuka yang tersedia.
