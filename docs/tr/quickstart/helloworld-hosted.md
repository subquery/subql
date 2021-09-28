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
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
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

![create github repo](/assets/img/github_create_new_repo.png)

GitHub URL'nizi not alın, SubQuery'nin erişebilmesi için bunun herkese açık olması gerekir.

![create github repo](/assets/img/github_repo_url.png)

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

![First commit](/assets/img/first_commit.png)

Kodunuzu GitHub'a aldığınıza göre, SubQuery Projects'te nasıl barındırabileceğimize bakalım.

## 4. Projenizi oluşturma

[https://project.subquery.network](https://project.subquery.network) gidin ve GitHub hesabınızla giriş yapın.

![Welcome to SubQuery Projects](/assets/img/welcome_to_subquery_projects.png)

Sonra yeni bir proje oluşturun,

![Welcome to SubQuery Projects](/assets/img/subquery_create_project.png)

Ve çeşitli alanları uygun ayrıntılarla doldurun.

- **GitHub account:** Birden fazla GitHub hesabınız varsa, bu projenin hangi hesap altında oluşturulacağını seçin. GitHub kuruluş hesabında oluşturulan projeler bu kuruluştaki üyeler arasında paylaşılır.
- **Project Name:** Projenize buradan bir ad verin.
- **Subtitle:** Projeniz için bir altyazı sağlayın.
- **Description:** SubQuery projenizin ne yaptığını açıklayın.
- **GitHub Repository URL:** Bu, SubQuery projenizi içeren genel bir depo için geçerli bir GitHub URL'si olmalıdır. Schema.graphql dosyası dizininizin kökünde olmalıdır.
- **Hide project:** Seçilirse, bu, projeyi genel SubQuery gezgininden gizler. SubQuerynuzu toplulukla paylaşmak istiyorsanız bunu seçimsiz tutun!

![Create SubQuery parameters](/assets/img/create_subquery_project_parameters.png)

Oluştur'u tıklatıp tıkladığınızda panonuza götürülürsünüz.

![SubQuery Project dashboard](/assets/img/subquery_project_dashboard.png)

Pano, kullandığı ağ, çalıştırdığı kaynak kodun GitHub deposu URL'si, ne zaman oluşturulduğu ve son güncelleştirilmesi ve özellikle dağıtım ayrıntıları gibi birçok yararlı bilgi içerir.

## 5. Projenizi dağıtma

Projenizi SubQuery Projeleri içinde oluşturduğunuza ve görüntüleme davranışını ayarladığınıza göre, bir sonraki adım projenizi çalışır hale getirmektir. Bir sürümü dağıtmak, yeni bir SubQuery dizin oluşturma işlemini başlatır ve GraphQL isteklerini kabul etmeye başlamak için gerekli sorgu hizmetini ayarlar. Yeni sürümleri varolan projelere de buradan dağıtabilirsiniz.

Üretim yuvası veya hazırlama yuvası gibi çeşitli ortamlara dağıtmayı seçebilirsiniz. Burada bir üretim yuvasına konuşlandıracağız. Clicking on the "Deploy" button brings up a screen with the following fields:

![Deploy to production slot](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:** From GitHub select the correct commit of the SubQuery project codebase that you want deployed
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [@subql/node](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [@subql/query](https://www.npmjs.com/package/@subql/query)

Because we only have one commit, there is only a single option in the drop down. We'll also work with the latest version of the indexer and query version so we will accept the defaults and then click "Deploy Update".

You’ll then see your deployment in “Processing” status. Here, your code is getting deployed onto the SubQuery's managed infrastructure. Basically a server is getting spun up on demand and being provisioned for you. This will take a few minutes so time to grab a coffee!

![Deployment processing](/assets/img/deployment_processing.png)

The deployment is now running.

![Deployment running](/assets/img/deployment_running.png)

## 6. Testing your project

To test your project, click on the 3 ellipsis and select "View on SubQuery Explorer".

![View Subquery project](/assets/img/view_on_subquery.png)

This will take you to the ever familiar "Playground" where you can click the play button and see the results of the query.

![Subquery playground](/assets/img/subquery_playground.png)

## 7. Bonus step

For the astute amongst us, you will recall that in the learning objectives, the last point was to run a simple GET query. To do this, we will need to grab the "Query Endpoint" displayed in the deployment details.

![Query endpoing](/assets/img/query_endpoint.png)

You can then send a GET request to this endpoint either using your favourite client such as [Postman](https://www.postman.com/) or [Mockoon](https://mockoon.com/) or via cURL in your terminal. For simplicity, cURL will be shown below.

The curl command to run is:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

giving the results of:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Readability is not a concern here as you will probably have some front end code to consume and parse this JSON response.

## Summary

In this SubQuery hosted quick start we showed how quick and easy it was to take a Subql project and deploy it to [SubQuery Projects](https://project.subquery.network) where all the infrastructure is provided for your convenience. There is an inbuilt playground for running various queries as well as an API endpoint for your code to integrate with.
