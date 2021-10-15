# Bir SubQuery projesinde nasıl hata ayıklama yapılır?

## Video rehberi

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giriş

Adım adım kodun üzerinden geçme, kesme noktalarını ayarlama ve değişkenleri inceleme gibi SubQuery projelerinde hata ayıklamak için Chrome geliştirici araçlarıyla birlikte bir Node.js inspector kullanmanız gerekir.

## Node inspector

Uçbirim ekranında aşağıdaki komutu çalıştırın.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Örneğin:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
Yardım için şuraya gözatın: https://nodejs.org/en/docs/inspector
Hata ayıklayıcı iliştirildi.
```

## Chrome geliştirici araçları

Chrome DevTools'u açın ve Kaynaklar sekmesine gidin. Yeşil simgeye tıkladığınızda yeni bir pencerenin açılacağını unutmayın.

![node inspect](/assets/img/node_inspect.png)

Dosya Sistemi'ne gidin ve proje klasörünüzü çalışma alanına ekleyin. Sonra dist > mappings dosyasını açın ve hata ayıklamak istediğiniz kodu seçin. Daha sonra, herhangi bir standart hata ayıklama aracında olduğu gibi adım adım kodun üzerinden geçin.

![debugging projects](/assets/img/debugging_projects.png)
