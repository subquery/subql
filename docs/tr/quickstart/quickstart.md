# Hızlı Başlangıç Kılavuzu

Bu Hızlı Başlangıç kılavuzunda, kendi SubQuery Projenizi geliştirmek için bir çerçeve olarak kullanılabilecek basit bir başlangıç projesi oluşturacağız.

Bu kılavuzun sonunda, verileri sorguyabileceğiniz bir GraphQL uç noktasına sahip bir SubQuery düğümünde çalışan çalışan bir SubQuery projeniz olacaktır.

Henüz yapmadıysanız, SubQuery'de kullanılan [terminology](../#terminology) hakkında bilgi sahibi > öneririz.

## Hazırlık

### Yerel Kalkınma Ortamı

- [Typescript](https://www.typescriptlang.org/), projeyi derlemek ve türleri tanımlamak için gereklidir.
- Hem SubQuery CLI hem de oluşturulan Project bağımlılıkları vardır ve modern bir sürüm [Node](https://nodejs.org/en/) gerektirir.
- SubQuery Nodes Docker gerektirir

### SubQuery CLI'sını yükleme

NPM kullanarak Terminalinize SubQuery CLI'yi genel olarak yükleyin:

```shell
# NPM
npm install -g @subql/cli
```

Lütfen **DO NOT**, zayıf bağımlılık yönetimi nedeniyle `yarn global` kullanımını teşvik ettiğimizi ve bunun da bir hataya yol açabileceğini unutmayın.

Daha sonra CLI tarafından sunulan kullanılabilir komutları ve kullanımı görmek için yardım çalıştırabilirsiniz

```shell
subql help
```

## Başlangıç SubQuery Projesini Başlatma

Bir SubQuery projesi oluşturmak istediğiniz dizinin içinde, `PROJECT_NAME` kendi projenizle değiştirin ve komutu çalıştırın:

```shell
subql init --starter PROJECT_NAME
```

SubQuery projesi initalised olarak size bazı sorular sorulana olacaktır:

- Git deposu (İsteğe Bağlı): Bu SubQuery projesinin barındırılacağı bir depoya Git URL'si sağlayın (SubQuery Gezgini'nde barındırıldığında)
- RPC uç noktası (Gerekli): Bu proje için varsayılan olarak kullanılacak çalışan bir RPC uç noktasına wss URL'si sağlayın. Farklı Polkadot ağları için genel uç noktalara hızlı bir şekilde erişebilir veya hatta [OnFinality](https://app.onfinality.io) kullanarak kendi özel özel düğümünüzü oluşturabilir veya yalnızca varsayılan Polkadot uç noktasını kullanabilirsiniz.
- Yazarlar (Gerekli): Bu SubQuery projesinin sahibini buraya girin
- Açıklama (İsteğe Bağlı): Projeniz hakkında hangi verileri içerdiğini ve kullanıcıların bu verilerle neler yapabileceğini açıklayan kısa bir paragraf sağlayabilirsiniz
- Sürüm (Gerekli): Özel bir sürüm numarası girin veya varsayılanı kullanın (`1.0.0`)
- Lisans (Gerekli): Bu proje için yazılım lisansını sağlayın veya varsayılanı kabul edin (`Apache-2.0`)

Başlatma işlemi tamamlandıktan sonra, dizin içinde proje adınızın oluşturulduğu bir klasör görmeniz gerekir. Bu directoy'un içeriği [Directory Structure](../create/introduction.md#directory-structure) listelenenlerle aynı olmalıdır.

Son olarak, proje dizini altında, yeni projenin bağımlılıklarını yüklemek için aşağıdaki komutu çalıştırın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell cd PROJECT_NAME yarn install ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash cd PROJECT_NAME npm install ``` </CodeGroupItem> </CodeGroup>

## Başlangıç Projesini Yapılandırma ve Oluşturma

Yeni başlatmış olduğunuz başlangıç paketinde, yeni projeniz için standart bir yapılandırma sağladık. Esas olarak aşağıdaki dosyalar üzerinde çalışacaksınız:

- The Manifest in `project.yaml`
- `schema.graphql`'daki GraphQL Şeması
- `src/mappings/` dizinindeki Eşleme işlevleri

Kendi SubQuerynuzu yazma hakkında daha fazla bilgi için [ Create a Projec](../create/introduction.md) altındaki belgelerimize göz atın

### GraphQL Model Oluşturma

SubQuery projenizi [index](../run/run.md) için, önce GraphQL Şema dosyanızda tanımladığınız gerekli GraphQL modellerini oluşturmalısınız (`schema.graphql`). Bu komutu proje dizininin kökünde çalıştırın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn codegen ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script codegen ``` </CodeGroupItem> </CodeGroup>

Oluşturulan modelleri `/src/types/models` dizininde bulabilirsiniz

## Projeyi Oluşturun

SubQuery Projenizi yerel olarak barındırılan bir SubQuery Node çalıştırmak için çalışmanızı oluşturmanız gerekir.

Yapı komutunu projenin kök dizininden çalıştırın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

## Başlangıç Projenizi Çalıştırma ve Sorgulama

Yeni projenizi hızlı bir şekilde [SubQuery Projects](https://project.subquery.network) 'a yayımlayabilmenize ve [Explorer](https://explorer.subquery.network),  kullanarak sorgulayabilmenize rağmen, SubQuery düğümlerini yerel olarak çalıştırmanın en kolay yolu bir Docker kapsayıcısındadır, zaten Docker'ınuz yoks [docker.com](https://docs.docker.com/get-docker/).

[_Bunu atla ve yeni projeni SubQuery Projeleri'ne yayımla_](../publish/publish.md)</em></a></em></a>

### SubQuery Projenizi Çalıştırma

SubQuery düğümünün nasıl çalıştırılacağını denetleyen tüm yapılandırma bu `docker-compose.yml` file. Yeni initalised yeni bir proje için burada hiçbir şeyi değiştirmenize gerek kalmayacak, ancak dosya ve ayarlar hakkında daha fazla bilgiyi [Run a Project section](../run/run.md)

Proje dizini altında aşağıdaki komutu çalıştırın:

```shell
docker-compose pull && docker-compose up
```

Gerekli paketleri ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) ve Postgres) ilk kez indirmek biraz zaman alabilir, ancak yakında çalışan bir SubQuery node görürsünüz.

### Projenizi Sorgulama

Tarayıcınızı açın ve [http://localhost:3000](http://localhost:3000) gidin.

Explorer'da ve sorguya hazır şemalarda bir GraphQL oyun alanının görüntü olduğunu görmeniz gerekir. Oyun alanının sağ üst kısmında, belge çizimini açacak bir _Docs_ düğmesi bulacaksınız. Bu belge otomatik olarak oluşturulur ve hangi varlıkları ve yöntemleri sorgulayabilirsiniz bulmanıza yardımcı olur.

Yeni bir SubQuery başlangıç projesi için, nasıl çalıştığını öğrenmek için aşağıdaki sorguyu deneyebilir veya [GraphQL Query dili hakkında daha fazla bilgi ](../query/graphql.md).

```graphql
query {
    starterEntities(first: 10) {
      nodes {
        field1
        field2
        field3
      }
    }
  }
}
```

## Sonraki Adımlar

Tebrikler, artık örnek veriler için GraphQL API isteklerini kabul eden yerel olarak çalışan bir SubQuery projeniz var. Bir sonraki kılavuzda, yeni projenizi [SubQuery Projects](https://project.subquery.network) nasıl yayımlayacağınızı ve [Explorer](https://explorer.subquery.network)'imizi kullanarak nasıl sorgulayacağınızı göstereceğiz

[Yeni projenizi SubQuery Projelerinde yayımlama](../publish/publish.md)
