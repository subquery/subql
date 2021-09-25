# Bagaimana cara mengubah ukuran blockchain fetching batch?

## Panduan video

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Pengenalan

Ukuran batch default adalah 100, tapi ini bisa diubah menggunakan perintah ekstra `--batch-size=xx`.

Anda perlu memasukkannya ke garis perintah sebagai extra flag atau jika menggunakan Docker, modifikasi file docker-compose.yml dengan:

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    restart: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - ./:/app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

Contoh ini mengatur ukuran batch (batch size) ke 50.

## Kenapa mengubah ukuran batch?

Menggunakan ukuran batch yang lebih kecil bisa mengurangi penggunaan memori dan tidak membuat pengguna menunggu untuk query yang besar. Dengan kata lain, aplikasi anda bisa jadi lebih responsif. 