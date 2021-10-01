# Farklı bir blok yüksekliğinde nasıl başlarılır?

## Video kılavuzu

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giriş

Varsayılan olarak, tüm başlangıç projeleri blockchain'i genesis bloğundan senkronize etmeye başlar. Diğer sözcüklerde, blok 1'den. Büyük blok zincirleri için, bunun tam olarak senkronize olması genellikle günler hatta haftalar alabilir.

Sıfır olmayan bir yükseklikten eşitleyici bir SubQuery düğümü başlatmak için tek yapmanız gereken project.yaml dosyanızı değiştirmek ve startBlock anahtarını değiştirmektir.

Aşağıda, başlangıç bloğunun 1.000.000 olarak ayarlandığı bir project.yaml dosyası verilmiştir

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

## Neden sıfırdan başlamıyorum?

Ana neden, blockchain'i senkronize etme süresini azaltabilmesidir. Bu, yalnızca son 3 aydaki işlemlerle ilgileniyorsanız, yalnızca son 3 ayı daha az bekleme süresi anlamına gelen senkronize edebilir ve gelişiminize daha hızlı başlayabilirsiniz.

## Sıfırdan başlamamanın dezavantajları nelerdir?

En belirgin dezavantajı, sahip olmadığınız bloklar için blok zincirindeki verileri sorgulayamayacaksınız.

## Mevcut blockchain yüksekliği nasıl bulunur?

Polkadot ağını kullanıyorsanız, [https://polkascan.io/](https://polkascan.io/) ziyaret edebilir, ağı seçebilir ve ardından "Kesinleştirilmiş Blok" rakamını görüntüleyebilirsiniz.

## Yeniden oluşturma mı yoksa kodekgen mi yapmam gerekiyor?

Hayır. Temelde bir yapılandırma dosyası olan project.yaml dosyasını değiştirdiğiniz için, typescript kodunu yeniden oluşturmanız veya yeniden oluşturmanız gerekmeyecektir.
