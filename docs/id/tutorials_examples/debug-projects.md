# Bagaimana cara men-debug proyek SubQuery?

## Panduan Video

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pengantar

Untuk men-debug proyek SubQuery seperti menelusuri kode, menyetel titik henti sementara, dan memeriksa variabel, Anda harus menggunakan pemeriksa Node.js bersama dengan alat Pencarian Google Chrome.

## Node Inspeksi

Jalankan perintah berikut di layar terminal.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Contoh:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
Untuk bantuan, klik link berikut: https://nodejs.org/en/docs/inspector
Debugger Terpasang.
```

## Alat Pengembang Chrome

Buka alat pengembang Chrome dan arahkan ke tab Sumber. Perhatikan bahwa mengklik ikon hijau akan membuka jendela baru.

![node inspect](/assets/img/node_inspect.png)

Arahkan ke Filesystem dan tambahkan folder proyek Anda ke ruang kerja. Kemudian buka folder dist > mappings dan pilih kode yang ingin Anda debug. Kemudian ikuti kode seperti halnya alat debugging standar.

![debugging projects](/assets/img/debugging_projects.png)
