# Blockchain getirme toplu iş boyutu nasıl değiştirilir?

## Video kılavuzu

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giriş

Varsayılan toplu iş boyutu 100'dür, ancak bu, `--batch-size=xx` komutu kullanılarak değiştirilebilir.

Bunu komut satırına ek bir bayrak olarak yapmanız veya Docker kullanıyorsanız, docker-compose.yml dosyasını aşağıdakilerle değiştirin:

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

Bu örnek, toplu iş boyutunu 50 olarak ayarlar.

## Toplu iş boyutu neden değiştirilir?

Daha küçük bir toplu iş boyutu kullanmak bellek kullanımını azaltabilir ve kullanıcıları büyük sorgular için asılı bırakmaz. Diğer sözcüklerde, uygulamanız daha duyarlı olabilir. 