# Hello World (localhost + Docker)

Bu SubQuery Hello World hızlı başlangıcına hoş geldiniz. Hızlı başlangıç, docker'da çalışan varsayılan başlangıç projesini birkaç basit adımda nasıl elde edersiniz göstermeyi amaçlamaktadır.

## Öğrenme hedefleri

Bu hızlı başlangıcın sonunda şunları yapmalıyız:

- gerekli önkoşulları anlamak
- temel ortak komutları anlamak
- localhost:3000'e gidebilmek ve oyun alanını görüntüleyebilmek
- Polkadot mainnet'in blok yüksekliğini almak için basit bir sorgu çalıştırın

## Hedeflenen hedef kitle

Bu kılavuz, bazı geliştirme deneyimine sahip ve SubQuery hakkında daha fazla bilgi edinmek isteyen yeni geliştiricilere yöneliktir.

## Video kılavuzu

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/j034cyUYb7k" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Önkoşullar

İhtiyacınız olacak:

- yarn veya npm paket yöneticisi
- SubQuery CLI (`@subql/cli`)
- Docker

Bu önkoşullardan herhangi birine sahip olup olmadığınızı görmek için terminalde aşağıdaki komutları çalıştırabilirsiniz.

```shell
yarn -v (or npm -v)
subql -v
docker -v
```

Daha ileri düzey kullanıcılar için aşağıdakileri kopyalayıp yapıştırın:

```shell
echo -e "My yarn version is:" `yarn -v` "\nMy subql version is:" `subql -v`  "\nMy docker version is:" `docker -v`
```

Bu döndürülmelidir: (npm kullanıcıları için ipliği npm ile değiştirin) vv

```shell
My yarn version is: 1.22.10
My subql version is: @subql/cli/0.9.3 darwin-x64 node-v16.3.0
My docker version is: Docker version 20.10.5, build 55c4c88
```

Yukarıdakileri alırsanız, gitmeye hazırsınız demektir. Değilse, yüklemek için şu bağlantıları izleyin:

- [yarn](https://classic.yarnpkg.com/en/docs/install/) veya [npm](https://www.npmjs.com/get-npm)
- [SubQuery CLI](quickstart.md#install-the-subquery-cli)
- [Docker](https://docs.docker.com/get-docker/)

## 1. Projeyi başlat

SubQuery ile başlarken ilk adım `subql init` komutunu çalıştırmaktır. `subqlHelloWorld` adıyla bir başlangıç projesi başlatalım. Yalnızca yazarın zorunlu olduğunu unutmayın. Aşağıda diğer her şey boş bırakılmıştır.

```shell
> subql init --starter subqlHelloWorld
Git repository:
RPC endpoint [wss://polkadot.api.onfinality.io/public-ws]:
Authors: sa
Description:
Version: [1.0.0]:
License: [Apache-2.0]:
Init the starter package... subqlHelloWorld is ready

```

Bu yeni dizine girmeyi unutmayın.

```shell
cd subqlHelloWorld
```

## 2. Bağımlılıkları yükleme

Şimdi çeşitli bağımlılıkları yüklemek için bir iplik veya düğüm yüklemesi yapın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm install ``` </CodeGroupItem> </CodeGroup>

Bir örnek `yarn install`

```shell
> yarn install
yarn install v1.22.10
bilgi Kilit dosyası bulunamadı.
[1/4] 🔍 Paketleri çözme...
[2/4] 🚚 Paket getiriyor...
[3/4] 🔗 Bağımlılıkları bağlama...
[4/4] 🔨 Yeni paketler oluşturma...
başarı Kilit dosyası kaydedildi.
✨ 31.84'lerde bitti.
```

## 3. Kod oluşturma

Şimdi GraphQL şemasından Typescript oluşturmak için `yarn codegen` çalıştırın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

Bir örnek`yarn codegen`

```shell
> yarn codegen
yarn run v1.22.10
$ ./node_modules/.bin/subql codegen
===============================
---------Subql Codegen---------
===============================
* Schema StarterEntity generated !
* Modeller endeksi oluşturuldu!
* Oluşturulan türler dizini !
✨ 1.02'lerde bitti.
```

**Warning** Şema dosyasında değişiklikler yapıldığında, türler dizininizi yeniden oluşturmanız için lütfen `yarn codegen` yeniden çalıştırmayı unutmayın.

## 4. Kod oluşturma

Bir sonraki adım, kodu `yarn build` ile oluşturmaktır.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

Bir örnek `yarn build`

```shell
> iplik yapısı
ip çalıştırma v1.22.10
$ tsc -b
✨ 5.68'lerde bitti.
```

## 5. Docker'ı çalıştırın

Docker'ı kullanmak, gerekli tüm altyapı Docker görüntüsünde sağlanabildiğinden bu örneği çok hızlı bir şekilde çalıştırmanıza olanak tanır. `docker-compose pull && liman işçisi-oluşturma`.

Bu, sonunda blokların getirildiği hayata her şeyi tekmeleyecek.

```shell
> #SNIPPET
subquery-node_1   | 2021-06-05T22:20:31.450Z <subql-node> INFO node started
subquery-node_1   | 2021-06-05T22:20:35.134Z <fetch> INFO fetch block [1, 100]
subqlhelloworld_graphql-engine_1 exited with code 0
subquery-node_1   | 2021-06-05T22:20:38.412Z <fetch> INFO fetch block [101, 200]
graphql-engine_1  | 2021-06-05T22:20:39.353Z <nestjs> INFO Starting Nest application...
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO AppModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.382Z <nestjs> INFO ConfigureModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.383Z <nestjs> INFO GraphqlModule dependencies initialized
graphql-engine_1  | 2021-06-05T22:20:39.809Z <nestjs> INFO Nest application successfully started
subquery-node_1   | 2021-06-05T22:20:41.122Z <fetch> INFO fetch block [201, 300]
graphql-engine_1  | 2021-06-05T22:20:43.244Z <express> INFO request completed

```

## 6. Oyun alanına göz atın

Http://localhost:3000/ gidin ve aşağıdaki sorguyu ekranın sol tarafına yapıştırın ve ardından oynat düğmesine basın.

```
{
 query{
   starterEntities(last:10, orderBy:FIELD1_ASC ){
     nodes{
       field1
     }
   }
 }
}

```

Yerel ev üzerinde SubQuery oyun alanı.

![oyun alanı localhost](/assets/img/subql_playground.png)

Oyun parkındaki blok sayısı, terminaldeki blok sayısıyla (teknik olarak blok yüksekliği) de eşleşmelidir.

## Özet

Bu hızlı başlangıçta, bir Docker ortamında bir başlangıç projesini çalışır durumda almak için temel adımları gösterdik ve ardından localhost:3000'e gittik ve ana ağ Polkadot ağının blok numarasını döndürmek için bir sorgu çalıştırdık.
