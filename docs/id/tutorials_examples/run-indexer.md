# Bagaimana cara menjalankan node pengindeks?

## Video Pengantar

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pengantar

Menjalankan node pengindeks adalah opsi lain selain menggunakan Docker atau memiliki proyek yang dihosting untuk Anda di [SubQuery Projects](https://project.subquery.network/). Ini membutuhkan lebih banyak waktu dan usaha tetapi akan meningkatkan pemahaman Anda tentang bagaimana SubQuery bekerja di bawah selimut.

## Postgres

Menjalankan node pengindeks pada infrastruktur Anda akan memerlukan pengaturan database Postgres. Anda dapat menginstal Postgres dari sini dan memastikan versinya 12 atau lebih tinggi.

## Install subql/node

Kemudian untuk menjalankan node SubQuery, jalankan perintah berikut:

```shell
npm install -g @subql/node
```

Flag-g berarti menginstalnya secara global yang berarti di OSX, lokasinya adalah /usr/local/lib/node_modules.

Setelah diinstal, Anda dapat memeriksa versi dengan menjalankan:

```shell
> subql-node --version
0.19.1
```

## Mengatur konfigurasi DB

Selanjutnya, Anda perlu mengatur variabel lingkungan berikut:

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

Tentu saja, jika Anda memiliki nilai yang berbeda untuk kunci di atas, harap sesuaikan. Perhatikan bahwa perintah `env` akan menampilkan variabel lingkungan saat ini dan proses ini hanya menetapkan nilai-nilai ini untuk sementara. Artinya, mereka hanya berlaku selama sesi terminal. Untuk mengaturnya secara permanen, simpan di ~/bash_profile Anda.

## Mengindeks proyek

Untuk mulai mengindeks proyek, navigasikan ke folder proyek Anda dan jalankan perintah berikut:

```shell
subql-node -f .
```

Jika Anda tidak memiliki proyek, git clone https://github.com/subquery/subql-helloworld. Anda akan melihat node pengindeks mulai aktif dan mulai mengindeks blok.

## Memeriksa Postgres

Jika Anda menavigasi ke Postgres, Anda akan melihat dua tabel dibuat. `public.subqueries` dan `subquery_1.starter_entities`.

`public.subqueries` hanya berisi 1 baris yang diperiksa oleh pengindeks saat memulai untuk "memahami keadaan saat ini" sehingga ia tahu dari mana harus melanjutkan. Abel `starter_entities` berisi indeks. Untuk melihat data, jalankan `select (*) from subquery_1.starter_entities`.
