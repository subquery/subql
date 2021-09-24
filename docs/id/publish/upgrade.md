# Terapkan Versi Baru Proyek SubQuery Anda

## Panduan

Meskipun Anda memiliki kebebasan untuk selalu meningkatkan dan menerapkan versi baru proyek SubQuery Anda, mohon berhati-hati selama proses ini jika proyek SubQuery Anda bersifat publik untuk dunia. Beberapa hal penting yang perlu diingat:
- Jika peningkatan Anda merupakan perubahan yang melanggar, baik membuat proyek baru (misal. `Proyek SubQuery saya V2`) atau memberi banyak peringatan kepada komunitas Anda tentang perubahan tersebut melalui jalur media sosial.
- Menerapkan versi proyek SubQuery baru menyebabkan beberapa waktu henti karena versi baru mengindeks rangkaian lengkap dari blok asal.

## Terapkan Perubahan

Masuk ke Proyek SubQuery dan pilih proyek yang ingin Anda terapkan versi barunya. Anda dapat memilih untuk menyebarkan ke slot produksi atau pementasan. Kedua slot ini adalah lingkungan yang terisolasi dan masing-masing memiliki database sendiri dan disinkronkan secara independen.

Kami merekomendasikan penerapan ke slot staging Anda hanya untuk pengujian staging akhir atau saat Anda perlu menyinkronkan ulang data proyek Anda. Anda kemudian dapat mempromosikannya ke produksi tanpa downtime. Anda akan menemukan pengujian lebih cepat saat [menjalankan proyek secara lokal](../run/run.md) karena Anda dapat [men-debug masalah dengan lebih mudah](../tutorials_examples/debug-projects.md).

Slot pementasan sangat cocok untuk:
* Validasi akhir perubahan pada Proyek SubQuery Anda di lingkungan yang terpisah. Slot pementasan memiliki URL berbeda untuk produksi yang dapat Anda gunakan di dApps Anda.
* Pemanasan dan pengindeksan data untuk proyek SubQuery yang diperbarui untuk menghilangkan waktu henti di dApp Anda
* Mempersiapkan rilis baru untuk Proyek SubQuery Anda tanpa mengeksposnya secara publik. Slot pementasan tidak ditampilkan kepada publik di Explorer dan memiliki URL unik yang hanya dapat dilihat oleh Anda.

![Staging slot](/assets/img/staging_slot.png)

#### Tingkatkan ke Latest Indexer and Query Service

Jika Anda hanya ingin meningkatkan ke pengindeks terbaru ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) atau layanan kueri ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) untuk mendapat keuntungan dari peningkatan stabilitas dan performa reguler kami, cukup pilih versi terbaru dari paket kami dan simpan. Ini hanya akan menyebabkan waktu henti beberapa menit.

#### Terapkan Versi Baru Proyek SubQuery Anda

Isi Commit Hash dari GitHub (salin commit hash penuh) dari versi basis kode proyek SubQuery yang ingin Anda terapkan. Ini akan menyebabkan waktu henti yang lebih lama tergantung pada waktu yang diperlukan untuk mengindeks rangkaian saat ini. Anda selalu dapat melaporkan kembali ke sini untuk perkembangan.

## Langkah Selanjutnya - Hubungkan ke Proyek Anda
Setelah penerapan Anda berhasil diselesaikan dan node kami telah mengindeks data Anda dari rangkaian, Anda akan dapat terhubung ke proyek Anda melalui titik akhir GraphQL Query yang ditampilkan.

![Proyek sedang diterapkan dan disinkronkan](/assets/img/projects-deploy-sync.png)

Kalau tidak, Anda dapat mengklik tiga titik di sebelah judul proyek Anda, dan melihatnya di SubQuery Explorer. Di sana Anda dapat menggunakan tempat bermain dalam browser untuk memulai - [baca selengkapnya tentang cara menggunakan Explorer kami di sini](../query/query.md).
