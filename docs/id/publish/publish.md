# Publikasikan Proyek SubQuery Anda

## Manfaat menghosting proyek Anda dengan SubQuery
- Kami akan menjalankan proyek SubQuery untuk Anda dalam layanan publik berkinerja tinggi, skalabel, dan terkelola
- Layanan ini disediakan untuk komunitas secara gratis!
- Anda dapat menjadikan proyek Anda publik sehingga akan dicantumkan di [SubQuery Explorer](https://explorer.subquery.network) dan siapa saja di seluruh dunia dapat melihatnya
- Kami terintegrasi dengan GitHub, jadi siapa pun di organisasi GitHub Anda dapat melihat proyek organisasi bersama

## Buat Proyek Pertama Anda

#### Masuk ke Proyek SubQuery

Sebelum memulai, pastikan proyek SubQuery Anda online di repositori GitHub publik. File `schema.graphql` harus berada di root direktori Anda.

Untuk membuat proyek pertama Anda, buka [project.subquery.network](https://project.subquery.network). Anda harus mengautentikasi dengan akun GitHub Anda untuk masuk.

Pada login pertama, Anda akan diminta untuk mengotorisasi SubQuery. Kami hanya memerlukan alamat email Anda untuk mengidentifikasi akun Anda, dan kami tidak menggunakan data lain apa pun dari akun GitHub Anda untuk alasan lain apa pun. Pada langkah ini, Anda juga dapat meminta atau memberikan akses ke akun Organisasi GitHub Anda sehingga Anda dapat memposting proyek SubQuery di bawah Organisasi GitHub alih-alih akun pribadi Anda.

![Cabut persetujuan dari akun GitHub](/assets/img/project_auth_request.png)

Proyek SubQuery adalah tempat Anda mengelola semua proyek yang dihosting yang diunggah ke platform SubQuery. Anda dapat membuat, menghapus, dan bahkan mengupgrade proyek semua dari aplikasi ini.

![Masuk Proyek](https://static.subquery.network/media/projects/projects-dashboard.png)

Jika Anda memiliki akun Organisasi GitHub yang terhubung, Anda dapat menggunakan pengalih di header untuk mengubah antara akun pribadi Anda dan akun Organisasi GitHub Anda. Proyek yang dibuat di akun Organisasi GitHub dibagikan di antara anggota di Organisasi GitHub tersebut. Untuk menghubungkan akun Organisasi GitHub Anda, Anda dapat [mengikuti langkah-langkah di sini](#add-github-organization-account-to-subquery-projects).

![Beralih antar akun GitHub](https://static.subquery.network/media/projects/projects-account-switcher.png)

#### Buat Proyek Pertama Anda

Mari kita mulai dengan mengklik "Buat Proyek". Anda akan dibawa ke formulir Proyek Baru. Silakan masukkan yang berikut (Anda dapat mengubahnya di masa mendatang):
- **Akun GitHub:** Jika Anda memiliki lebih dari satu akun GitHub, pilih akun mana yang akan dibuat proyek ini. Proyek yang dibuat di akun organisasi GitHub dibagikan di antara anggota di organisasi itu.
- **Nama**
- **Subtitle**
- **Deskripsi**
- **URL Repositori GitHub:** Ini harus berupa URL GitHub yang valid untuk repositori publik yang memiliki proyek SubQuery Anda. File `schema.graphql` harus berada di root direktori Anda ([pelajari lebih lanjut tentang struktur direktori](../create/introduction.md#directory-structure)).
- **Sembunyikan proyek:** Jika dipilih, ini akan menyembunyikan proyek dari penjelajah SubQuery publik. Biarkan ini tidak dipilih jika Anda ingin membagikan SubQuery Anda dengan komunitas! ![Buat Proyek pertama Anda](https://static.subquery.network/media/projects/projects-create.png)

Buat proyek Anda dan Anda akan melihatnya di daftar Proyek SubQuery Anda. *Kita hampir sampai! Kita hanya perlu menerapkan versi barunya. * ![Membuat Proyek tanpa penerapan](https://static.subquery.network/media/projects/projects-no-deployment.png)

#### Terapkan Versi pertama Anda

Saat membuat proyek akan mengatur perilaku tampilan proyek, Anda harus menerapkan sebuah versi sebelum menjadi operasional. Menerapkan versi memicu operasi pengindeksan SubQuery baru untuk memulai, dan menyiapkan layanan kueri yang diperlukan untuk mulai menerima permintaan GraphQL. Anda juga dapat menerapkan versi baru ke proyek yang ada di sini.

Dengan proyek baru Anda, Anda akan melihat tombol Deploy New Version. Klik ini, dan isi informasi yang diperlukan tentang penerapan:
- **Komit Hash Versi baru:** Dari GitHub, salin hash komit penuh versi basis kode proyek SubQuery yang ingin Anda terapkan
- **Versi Pengindeks:** Ini adalah versi layanan simpul SubQuery yang Anda inginkan untuk menjalankan SubQuery ini. Lihat [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Versi Kueri:** Ini adalah versi layanan kueri SubQuery yang Anda inginkan untuk menjalankan SubQuery ini. Lihat [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Terapkan Proyek pertama Anda](https://static.subquery.network/media/projects/projects-first-deployment.png)

Jika berhasil diterapkan, Anda akan melihat pengindeks mulai bekerja dan melaporkan kembali kemajuan pengindeksan chain saat ini. Proses ini mungkin memakan waktu hingga mencapai 100%.

## Langkah Selanjutnya - Hubungkan ke Proyek Anda
Setelah penerapan Anda berhasil diselesaikan dan node kami telah mengindeks data Anda dari chain, Anda akan dapat terhubung ke proyek Anda melalui titik akhir Kueri GraphQL yang ditampilkan.

![Proyek sedang diterapkan dan disinkronkan](https://static.subquery.network/media/projects/projects-deploy-sync.png)

Atau, Anda dapat mengklik tiga titik di sebelah judul proyek Anda, dan melihatnya di SubQuery Explorer. Di sana Anda dapat menggunakan taman bermain dalam browser untuk memulai - [baca selengkapnya tentang cara menggunakan Explorer kami di sini](../query/query.md).

![Proyek di SubQuery Explorer](https://static.subquery.network/media/projects/projects-explorer.png)

## Tambahkan Akun Organisasi GitHub ke Proyek SubQuery

Umum untuk mempublikasikan proyek SubQuery Anda dengan nama akun Organisasi GitHub Anda daripada akun GitHub pribadi Anda. Kapan pun Anda dapat mengubah akun yang dipilih saat ini di [Proyek SubQuery](https://project.subquery.network) menggunakan pengalih akun.

![Beralih antar akun GitHub](https://static.subquery.network/media/projects/projects-account-switcher.png)

Jika Anda tidak dapat melihat akun Organisasi GitHub Anda tercantum di pengalih, Anda mungkin perlu memberikan akses ke SubQuery untuk Organisasi GitHub Anda (atau memintanya dari administrator). Untuk melakukan ini, Anda harus terlebih dahulu mencabut izin dari akun GitHub Anda ke Aplikasi SubQuery. Untuk melakukannya, masuk ke pengaturan akun Anda di GitHub, buka Aplikasi, dan di bawah tab Aplikasi OAuth Resmi, cabut SubQuery - [Anda dapat mengikuti langkah-langkah yang tepat di sini](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Jangan khawatir, ini tidak akan menghapus proyek SubQuery Anda dan Anda tidak akan kehilangan data apa pun.**

![Cabut akses ke akun GitHub](/assets/img/project_auth_revoke.png)

Setelah Anda mencabut akses, keluar dari [Proyek SubQuery](https://project.subquery.network) dan masuk kembali. Anda harus diarahkan ke halaman berjudul *Otorisasi SubQuery* di mana Anda dapat meminta atau memberikan akses SubQuery ke akun Organisasi GitHub Anda. Jika Anda tidak memiliki izin admin, Anda harus membuat permintaan kepada administrator untuk mengaktifkannya untuk Anda.

![Cabut persetujuan dari akun GitHub](/assets/img/project_auth_request.png)

Setelah permintaan ini disetujui oleh administrator Anda (atau jika dapat mengabulkannya sendiri), Anda akan melihat akun Organisasi GitHub yang benar di pengalih akun.