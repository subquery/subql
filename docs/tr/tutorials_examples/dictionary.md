# SubQuery sözlüğü nasıl çalışır?

Bir genel sözlük projesinin amacı, bir blok zincirindeki tüm verileri indekslemek ve bir veri tabanındaki olayları, dışsal öğeleri ve türlerini (modül ve metot) blok yüksekliği sırasına göre takip etmektir. Daha sonra başka bir proje, manifest dosyasında tanımlanan varsayılan `network.endpoint` yerine bu `network.dictionary` uç noktasını sorgulayabilir.

`network.dictionary` uç noktası, varsa SDK'nın otomatik olarak algılayacağı ve kullanacağı isteğe bağlı bir parametredir. `network.endpoint` zorunludur ve eğer mevcut değilse derlenemez.

[SubQuery dictionary](https://github.com/subquery/subql-dictionary) projesini örnek alırsak, [schema](https://github.com/subquery/subql-dictionary/blob/main/schema.graphql) dosyası 3 adet varlık tanımlar; dış öğeler, olaylar ve specVersion. Bu 3 varlık sırasıyla 6, 4 ve 2 alan içerir. Bu proje çalıştırıldığında, bu alanlar veritabanı tablolarına yansıtılır.

![extrinsics table](/assets/img/extrinsics_table.png) ![events table](/assets/img/events_table.png) ![specversion table](/assets/img/specversion_table.png)

Blok zincirinden gelen veriler daha sonra bu tablolarda saklanır ve performans için indekslenir. Proje daha sonra SubQuery projelerinde barındırılır ve API uç noktası manifest dosyasına eklenebilir.

## Bir sözlüğü projenize nasıl dahil edersiniz?

Manifest'in ağ bölümüne `dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot` ekleyin. Örneğin:

```shell
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

## Sözlük KULLANILMAZSA ne olur?

Sözlük kullanılmadığında, indeksleyici polkadot api aracılığıyla her blok verisini varsayılan olarak 100 olan `batch-size` bayrağına göre getirir ve bunu işlemek için bir arabelleğe yerleştirir. Daha sonra, indeksleyici tüm bu blokları arabellekten alır ve blok verilerini işlerken, bu bloklardaki olayın ve dışsal öğenin kullanıcı tanımlı filtreyle eşleşip eşleşmediğini denetler.

## Sözlük KULLANILIRSA ne olur?

Sözlük kullanıldığında, indeksleyici önce çağrı ve olay filtrelerini parametre olarak alır ve bunu bir GraphQL sorgusunda birleştirir. Daha sonra sözlüğün API'sini yalnızca belirli olayları ve dışsal öğeleri içeren ilgili blok yüksekliklerinin bir listesini elde etmek için kullanır. Varsayılan uygulanırsa, bu genellikle 100'den çok daha azdır.

Örneğin, aktarım olaylarını indekslediğinizi düşünün. Tüm bloklarda bu olay yoktur (aşağıdaki resimde blok 3 ve 4'te aktarım olayı yoktur).

![dictionary block](/assets/img/dictionary_blocks.png)

Sözlük, projenizin bunu atlamasına olanak verir, böylece bir aktarım olayı için her bloğa bakmak yerine, yalnızca 1, 2 ve 5 bloklarına atlar. Bunun nedeni, her bloğun sözlüğünün tüm çağrılara ve olaylara önceden hesaplanmış bir referans olmasıdır.

Bu, bir sözlük kullanmanın, indeksleyici tarafından zincirden elde edilen veri miktarını ve yerel arabellekte depolanan "istenmeyen" blokların sayısını azaltabileceği anlamına gelir. Ancak geleneksel yöntemle karşılaştırıldığında, sözlüğün API'sinden veri almak için ek bir adım ekler.

## Sözlük ne zaman yararlı DEĞİLDİR?

Bir zincirden veri almak için [block handlers](https://doc.subquery.network/create/mapping.html#block-handler) kullanıldığında, her bloğun işlenmesi gerekir. Sonuç olarak, bu durumda bir sözlük kullanmak hiçbir fayda sağlamaz ve indeksleyici varsayılan sözlük dışı stratejiye geri döner.

Ayrıca, `timestamp.set` gibi her blokta meydana gelen veya var olan olaylar yada dışsal öğelerle uğraşırken sözlük kullanmak herhangi bir ek avantaj sağlamayacaktır.
