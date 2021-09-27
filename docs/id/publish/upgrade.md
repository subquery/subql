# Terapkan Versi Baru Proyek SubQuery Anda

## Panduan

Meskipun Anda memiliki kebebasan untuk selalu meningkatkan dan menerapkan versi baru proyek SubQuery Anda, mohon berhati-hati selama proses ini jika proyek SubQuery Anda bersifat publik untuk dunia. Beberapa hal penting yang perlu diingat:
- Jika peningkatan Anda merupakan perubahan yang melanggar, baik membuat proyek baru (misal. `My SubQuery Project V2`) atau memberi banyak peringatan kepada komunitas Anda tentang perubahan tersebut melalui jalur media sosial.
- Menerapkan versi proyek SubQuery baru menyebabkan beberapa waktu henti karena versi baru mengindeks rangkaian lengkap dari blok asal.

## Terapkan Perubahan

Masuk ke SubQuery Projects, dan temukan proyek yang ingin Anda terapkan versi barunya. Di bawah Deployment Details Anda akan melihat tiga titik di kanan atas, klik tombol Deploy New Version.

![Terapkan versi baru ke Proyek Anda](https://static.subquery.network/media/projects/projects-second-deploy.png)

#### Tingkatkan ke Latest Indexer and Query Service

Jika Anda hanya ingin meningkatkan ke pengindeks terbaru ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) atau layanan kueri ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) untuk mendapat keuntungan dari peningkatan stabilitas dan performa reguler kami, cukup pilih versi terbaru dari paket kami dan simpan. Ini hanya akan menyebabkan waktu henti beberapa menit.

#### Terapkan Versi Baru Proyek SubQuery Anda

Isi Commit Hash dari GitHub (salin commit hash penuh) dari versi basis kode proyek SubQuery yang ingin Anda terapkan. Ini akan menyebabkan waktu henti yang lebih lama tergantung pada waktu yang diperlukan untuk mengindeks rangkaian saat ini. Anda selalu dapat melaporkan kembali ke sini untuk perkembangan.

## Langkah Selanjutnya - Hubungkan ke Proyek Anda
Setelah penerapan Anda berhasil diselesaikan dan node kami telah mengindeks data Anda dari rangkaian, Anda akan dapat terhubung ke proyek Anda melalui titik akhir GraphQL Query yang ditampilkan.

![Proyek sedang diterapkan dan disinkronkan](https://static.subquery.network/media/projects/projects-deploy-sync.png)

Kalau tidak, Anda dapat mengklik tiga titik di sebelah judul proyek Anda, dan melihatnya di SubQuery Explorer. Di sana Anda dapat menggunakan tempat bermain dalam browser untuk memulai - [baca selengkapnya tentang cara menggunakan Explorer kami di sini](../query/query.md).
