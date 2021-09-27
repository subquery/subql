# Bagaimana cara kerja kamus SubQuery?

Seluruh ide dari proyek kamus generik adalah untuk mengindeks semua data dari blockchain dan merekam peristiwa, ekstrinsik, dan jenisnya (modul dan metode) dalam database dalam urutan tinggi blok. Proyek lain kemudian dapat menanyakan titik akhir `network.dictionary` ini alih-alih `network.dictionary` default yang ditentukan dalam file manifes.

Titik akhir `network.dictionary` adalah parameter opsional yang jika ada, SDK akan secara otomatis mendeteksi dan menggunakannya. `network.endpoint` adalah wajib dan tidak akan dikompilasi jika tidak ada.

Mengambil proyek kamus SubQuery sebagai contoh, file skema mendefinisikan 3 entitas; ekstrinsik, peristiwa, specVersion. 3 entitas ini masing-masing berisi 6, 4, dan 2 bidang. Ketika proyek ini dijalankan, bidang ini tercermin dalam tabel database.

![tabel ekstrinsik](/assets/img/extrinsics_table.png) ![tabel peristiwa](/assets/img/events_table.png) ![tabel spekversi](/assets/img/specversion_table.png)

Data dari blockchain kemudian disimpan dalam tabel ini dan diindeks untuk kinerja. Proyek kemudian di-host di Proyek SubQuery dan titik akhir API tersedia untuk ditambahkan ke file manifes.

## Bagaimana cara memasukkan kamus ke dalam proyek Anda?

Tambah `kamus: https://api.subquery.network/sq/subquery/dictionary-polkadot` ke bagian jaringan manifes. Misalnya:

```shell
jaringan:
  titik akhir: wss://polkadot.api.onfinality.io/public-ws
  kamus: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

## Apa yang terjadi jika kamus TIDAK digunakan?

Ketika kamus TIDAK digunakan, pengindeks akan mengambil setiap blok data melalui api polkadot sesuai dengan ukuran batch bendera yang 100 secara default, dan menempatkan ini dalam buffer untuk diproses. Kemudian, pengindeks mengambil semua blok ini dari buffer dan saat memproses data blok, memeriksa apakah peristiwa dan ekstrinsik dalam blok ini cocok dengan filter yang ditentukan pengguna.

## Apa yang terjadi ketika kamus IS digunakan?

Ketika kamus IS digunakan, pengindeks pertama-tama akan mengambil panggilan dan filter peristiwa sebagai parameter dan menggabungkannya ke dalam kueri GraphQL. Kemudian menggunakan API kamus untuk mendapatkan daftar ketinggian blok yang relevan saja yang berisi peristiwa dan ekstrinsik tertentu. Seringkali ini secara substansial kurang dari 100 jika default digunakan.

Misalnya, bayangkan situasi di mana Anda mengindeks peristiwa transfer. Tidak semua blok memiliki event ini (pada gambar di bawah tidak ada event transfer di blok 3 dan 4).

![blok kamus](/assets/img/dictionary_blocks.png)

Kamus memungkinkan proyek Anda untuk melewati ini jadi daripada mencari di setiap blok untuk acara transfer, itu melompat ke hanya blok 1, 2, dan 5. Ini karena kamus adalah referensi pra-komputasi untuk semua panggilan dan acara di masing-masing memblokir.

Ini berarti bahwa menggunakan kamus dapat mengurangi jumlah data yang diperoleh pengindeks dari rantai dan mengurangi jumlah blok "yang tidak diinginkan" yang disimpan di buffer lokal. Tetapi dibandingkan dengan metode tradisional, ini menambahkan langkah tambahan untuk mendapatkan data dari API kamus.

## Kapan kamus TIDAK berguna?

Ketika penangan blok digunakan untuk mengambil data dari rantai, setiap blok perlu diproses. Oleh karena itu, menggunakan kamus dalam hal ini tidak memberikan keuntungan apa pun dan pengindeks akan secara otomatis beralih ke pendekatan non-kamus default.

Juga, ketika berhadapan dengan peristiwa atau ekstrinsik yang terjadi atau ada di setiap blok seperti `timestamp.set`, menggunakan kamus tidak akan menawarkan keuntungan tambahan.
