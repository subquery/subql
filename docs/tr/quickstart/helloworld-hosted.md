# Hello World (SubQuery Barındırılan)

Bu hızlı başlangıcın amacı, Subquery projelerinde (yönetilen hizmetimiz) çalışan varsayılan başlangıç projesini birkaç kolay adımda nasıl alabileceğinizi göstermektir.

Basit başlangıç projesini (ve şimdiye kadar öğrendiğimiz her şeyi) alacağız, ancak Docker içinde yerel olarak çalıştırmak yerine, SubQuery'nin yönetilen barındırma altyapısından yararlanacağız. Başka bir deyişle, subquery'nin tüm ağır kaldırma, çalıştırma ve üretim altyapısını yönetmesine izin veriyoruz.

## Öğrenme hedefleri

Bu hızlı başlangıcın sonunda şunları yapmalıyız:

- gerekli önkoşulları anlamak
- [SubQuery Projects](https://project.subquery.network/) bir proje barındırabilir
- oyun alanını kullanarak Polkadot mainnet'in blok yüksekliğini elde etmek için basit bir sorgu çalıştırın
- сURL kullanarak Polkadot mainnet'in blok yüksekliğini elde etmek için basit bir GET sorgusu çalıştırın

## Hedeflenen hedef kitle

Bu kılavuz, bazı geliştirme deneyimine sahip ve SubQuery hakkında daha fazla bilgi edinmek isteyen yeni geliştiricilere yöneliktir.

## Video kılavuzu

<figure class="video_container">
  <iframe src="ps://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Önkoşullar

İhtiyacınız olacak:

- GitHub Hesabı

## 1. Projenizi oluşturma

Subql_hellowworld adlı bir proje oluşturalım ve zorunlu yükleme, codegen ve derlemeyi en sevdiğiniz paket yöneticisiyle çalıştıralım.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

Yine de docker komutlarını ÇALıŞTıRMAYIN.

## 2. GitHub repo'yu oluşturma

GitHub'da yeni bir genel depo oluşturun. Bir ad girin ve görünürlüğünüzü herkese açık olarak ayarlayın. Burada, her şey şimdilik varsayılan olarak tutulur.

![github repo oluşturma](/assets/img/github_create_new_repo.png)

GitHub URL'nizi not alın, SubQuery'nin erişebilmesi için bunun herkese açık olması gerekir.

![github repo oluşturma](/assets/img/github_repo_url.png)

## 3. GitHub'a itin

Proje dizininizde, git dizini olarak başlatın. Aksi takdirde, "önemli: git deposu (veya üst dizinlerden herhangi biri değil): .git" hatasını alabilirsiniz

```shell
git init
```

Ardından şu komutu içeren bir uzak depo ekleyin:

```shell
git uzaktan ekleme kaynak https://github.com/seandotau/subqlHelloWorld.git
```

Bu temel olarak uzak deponuzu "https://github.com/seandotau/subqlHelloWorld.git" olarak ayarlar ve GitHub'daki bir uzak deponun standart isimlendirmesi olan "origin" adını verir.

Daha sonra kodu aşağıdaki komutlarla repomuza ekliyoruz:

```shell
> git ekleyin.
> git commit -m "First commit"
[master (root-commit) a999d88] First commit
10 files changed, 3512 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 docker-compose.yml
create mode 100644 package.json
create mode 100644 project.yaml
create mode 100644 schema.graphql
create mode 100644 src/index.ts
create mode 100644 src/mappings/mappingHandlers.ts
create mode 100644 tsconfig.json
create mode 100644 yarn.lock
> git push origin master
Enumerating objects: 14, done.
Nesneleri sayma: %100 (14/14), bitti.
12 iş parçacığına kadar kullanarak delta sıkıştırma
Nesneleri sıkıştırma: %100 (13/13), bitti.
Yazma nesneleri: %100 (14/14), 59.35 KiB | 8.48 MiB/s, bitti.
Toplam 14 (delta 0), yeniden kullanılan 0 (delta 0)
https://github.com/seandotau/subqlHelloWorld.git için
 * [yeni dal] usta -> ustası

```

Push komutu "lütfen kodumu ana yerel repo'mdan kaynak repo'ya itin" anlamına gelir. GitHub'ı yenilemek GitHub'daki tüm kodu göstermelidir.

![İlk tamamlama](/assets/img/first_commit.png)

Kodunuzu GitHub'a aldığınıza göre, SubQuery Projects'te nasıl barındırabileceğimize bakalım.

## 4. Projenizi oluşturma

[https://project.subquery.network](https://project.subquery.network) gidin ve GitHub hesabınızla giriş yapın.

![SubQuery Projelerine Hoş Geldiniz](/assets/img/welcome_to_subquery_projects.png)

Sonra yeni bir proje oluşturun,

![SubQuery Projelerine Hoş Geldiniz](/assets/img/subquery_create_project.png)

Ve çeşitli alanları uygun ayrıntılarla doldurun.

- **GitHub account:** Birden fazla GitHub hesabınız varsa, bu projenin hangi hesap altında oluşturulacağını seçin. GitHub kuruluş hesabında oluşturulan projeler bu kuruluştaki üyeler arasında paylaşılır.
- **Project Name:** Projenize buradan bir ad verin.
- **Subtitle:** Projeniz için bir altyazı sağlayın.
- **Description:** SubQuery projenizin ne yaptığını açıklayın.
- **GitHub Repository URL:** Bu, SubQuery projenizi içeren genel bir depo için geçerli bir GitHub URL'si olmalıdır. Schema.graphql dosyası dizininizin kökünde olmalıdır.
- **Hide project:** Seçilirse, bu, projeyi genel SubQuery gezgininden gizler. SubQuerynuzu toplulukla paylaşmak istiyorsanız bunu seçimsiz tutun!

![SubQuery parametreleri oluştur](/assets/img/create_subquery_project_parameters.png)

Oluştur'u tıklatıp tıkladığınızda panonuza götürülürsünüz.

![SubQuery Projesi panosu](/assets/img/subquery_project_dashboard.png)

Pano, kullandığı ağ, çalıştırdığı kaynak kodun GitHub deposu URL'si, ne zaman oluşturulduğu ve son güncelleştirilmesi ve özellikle dağıtım ayrıntıları gibi birçok yararlı bilgi içerir.

## 5. Projenizi dağıtma

Projenizi SubQuery Projeleri içinde oluşturduğunuza ve görüntüleme davranışını ayarladığınıza göre, bir sonraki adım projenizi çalışır hale getirmektir. Bir sürümü dağıtmak, yeni bir SubQuery dizin oluşturma işlemini başlatır ve GraphQL isteklerini kabul etmeye başlamak için gerekli sorgu hizmetini ayarlar. Yeni sürümleri varolan projelere de buradan dağıtabilirsiniz.

Üretim yuvası veya hazırlama yuvası gibi çeşitli ortamlara dağıtmayı seçebilirsiniz. Burada bir üretim yuvasına konuşlandıracağız. "Deploy" düğmesine tıklanın, aşağıdaki alanlara sahip bir ekran açılır:

![Üretim yuvasına dağıt](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:** GitHub'dan, dağıtılmasını istediğiniz SubQuery projesi kod tabanının doğru şekilde tamamlanmış olmasını seçin
- **Indexer Version:** Bu, SubQuery'yi çalıştırmak istediğiniz SubQuery düğüm hizmetinin sürümüdür. Bkz[@subql/node](https://www.npmjs.com/package/@subql/node)
- **Query Version:** Bu, Bu SubQuery'yu çalıştırmak istediğiniz SubQuery'nin sorgu hizmetinin sürümüdür. Bkz>@subql<0/query</a>

Tek bir taahhüdümuz olduğu için, açılır yolda tek bir seçenek var. Ayrıca dizinleyicinin en son sürümü ve sorgu sürümüyle çalışacağız, böylece varsayılanları kabul edeceğiz ve ardından "Deploy Update" ı tıklayacağız.

Daha sonra dağıtımınızı "Processing" durumunda görürsünüz. Burada, kodunuz SubQuery'nun yönetilen altyapısına dağıtılıyor. Temel olarak bir sunucu talep üzerine döndürülür ve sizin için tedarik edilir. Bu birkaç dakika sürecek, bu yüzden bir kahve almak için zaman!

![Dağıtım işleme](/assets/img/deployment_processing.png)

Dağıtım şimdi çalışıyor.

![Dağıtım çalışıyor](/assets/img/deployment_running.png)

## 6. Projenizi test etme

Projenizi sınamak için 3 üç noktayı tıklatın ve "View on SubQuery Explorer"yi seçin.

![SubQuery projesini görüntüle](/assets/img/view_on_subquery.png)

Bu sizi oynat düğmesine tıklayabileceğiniz ve sorgunun sonuçlarını görebileceğiniz tanıdık "Playground"na götürecektir.

![SubQuery oyun alanı](/assets/img/subquery_playground.png)

## 7. Bonus adım

Aramızdaki zekilik için, öğrenme hedeflerinde son noktanın basit bir GET sorgusu çalıştırmak olduğunu hatırlayacaksınız. Bunu yapmak için, dağıtım ayrıntılarında görüntülenen "Query Endpoin" almamız gerekir.

![Sorgu sonpoing](/assets/img/query_endpoint.png)

Daha sonra bu uç noktaya [Postman](https://www.postman.com/) veya [Mockoon](https://mockoon.com/) gibi favori istemcinizi kullanarak veya terminalinizdeki cURL aracılığıyla bir GET isteği gönderebilirsiniz. Basitlik için cURL aşağıda gösterilecektir.

Çalıştıracak kıvrılma komutu:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

sonuçlarını vererek:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Okunabilirlik burada bir endişe değildir, çünkü muhtemelen bu JSON yanıtını tüketmek ve ayrıştırmak için bazı ön uç kodunuz olacaktır.

## Özet

Bu SubQuery ev sahipliği yaptığı hızlı başlangıçta, bir Subql projesini alıp [SubQuery Projects](https://project.subquery.network) dağıtmanın ne kadar hızlı ve kolay olduğunu gösterdik. Çeşitli sorguları çalıştırmak için dahili bir oyun alanının yanı sıra kodunuzun tümleştirilmek için bir API uç noktası vardır.
