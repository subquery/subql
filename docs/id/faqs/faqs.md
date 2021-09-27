# Pertanyaan yang sering diajukan

## Apa itu SubQuery?

SubQuery adalah sebuah proyek sumber terbuka yang memungkinkan pengembang untuk menyusun, mengubah, dan membuat kueri data rantai Substrat untuk menggerakkan aplikasi mereka.

SubQuery juga menyediakan penyelenggaraan proyek kelas produksi gratis untuk pengembang yang menghilangkan tanggung jawab mengelola infrastruktur, dan membiarkan pengembang melakukan yang terbaik - membangun.

## Apa cara terbaik untuk memulai SubQuery?

Cara terbaik untuk memulai SubQuery adalah dengan mencoba [tutorial Hello World](../quickstart/helloworld-localhost.md) kami. Ini adalah 5 menit sederhana untuk mengunduh template pemula, membangun proyek, dan kemudian menggunakan Docker untuk menjalankan node di localhost Anda dan menjalankan kueri sederhana.

## Bagaimana saya bisa berkontribusi atau memberi umpan balik ke SubQuery?

Kami menyukai kontribusi dan umpan balik dari komunitas. Untuk menyumbang kode, pisahkan penyimpanan yang menarik dan buat perubahan Anda. Kemudian kirimkan PR atau Pull Request. Oh, jangan lupa juga untuk menguji! Lihat juga garis panduan kontribusi kami (akan diberitahu).

Untuk memberi umpan balik, hubungi kami di hello@subquery.network atau buka [discord channel](https://discord.com/invite/78zg8aBSMG) kami

## Berapa biaya untuk menyelenggarakan proyek saya di Proyek SubQuery?

Menyelenggarakan proyek Anda di Proyek SubQuery sepenuhnya gratis - ini adalah cara kami mengembalikan kepada komunitas. Untuk mempelajari bagaimana menyelenggarakan proyek Anda bersama kami, silakan lihat tutorial [Hello World (SubQuery diselenggarakan)](../quickstart/helloworld-hosted.md).

## Apa itu slot penyebaran?

Slot penyebaran adalah fitur di [Proyek SubQuery](https://project.subquery.network) yang setara dengan lingkungan pengembangan. Contohnya, dalam organisasi perangkat lunak apa pun biasanya ada lingkungan pengembangan dan lingkungan produksi minimal (mengabaikan localhost). Biasanya lingkungan tambahan seperti tahapan dan pra-produksi atau bahkan QA sudah termasuk tergantung pada kebutuhan organisasi dan pengaturan pengembangannya.

SubQuery saat ini memiliki dua slot yang tersedia. Sebuah slot tahapan dan slot produksi. Ini memungkinkan pengembang untuk menyebarkan SubQuery mereka ke lingkungan tahapan dan semuanya berjalan dengan baik, "maju ke produksi" dengan mengklik tombol.

## Apa keuntungan dari slot tahapan?

Keuntungan utama menggunakan slot tahapan adalah memungkinkan Anda menyiapkan rilis proyek SubQuery baru Anda tanpa memaparkannya secara publik. Anda dapat menunggu slot tahapan untuk menyusun ulang semua data tanpa mempengaruhi aplikasi produksi Anda.

Slot tahapan tidak ditampilkan kepada publik di [Explorer](https://explorer.subquery.network/) dan memiliki URL unik yang hanya dapat dilihat oleh Anda. Dan tentu saja, lingkungan terpisah memungkinkan Anda menguji kode baru tanpa mempengaruhi produksi.

## Apa itu ekstrinsik?

Jika Anda sudah akrab dengan konsep blockchain, Anda dapat menganggap ekstrinsik sebanding dengan transaksi. Lebih formal, ekstrinsik adalah sepotong informasi yang berasal dari luar rantai dan termasuk dalam blok. Ada tiga kategori ekstrinsik. Yaitu inheren, transaksi yang ditandatangani, dan transaksi yang tidak ditandatangani.

Ekstrinsik inheren adalah potongan informasi yang tidak ditandatangani dan hanya dimasukkan ke dalam blok oleh pencipta blok.

Ekstrinsik transaksi yang ditandatangani adalah transaksi yang berisi tanda tangan dari rekening yang mengeluarkan transaksi. Mereka ada untuk membayar biaya agar transaksi termasuk dalam rantai.

Transaksi ekstrinsik yang tidak ditandatangani adalah transaksi yang tidak berisi tanda tangan dari rekening yang mengeluarkan transaksi. Ekstrinsik transaksi yang tidak ditandatangani harus digunakan dengan hati-hati karena tidak ada yang membayar biaya, karena itu ditandatangani. Karena ini, antrian transaksi kekurangan logika ekonomi untuk mencegah spam.

Untuk informasi lebih lanjut, klik [di sini](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).