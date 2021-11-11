# Yeni bir SubQuery Projesi Oluşturma

[quick start](/quickstart/quickstart.md) kılavuzunda, SubQuery'nin ne olduğunu ve nasıl çalıştığını size tattırmak için çok hızlı bir şekilde bir örnek inceledik. Burada projenizi oluştururken iş akışına ve çalışacağınız anahtar dosyalara daha yakından bakacağız.

## Temel İş Akışı

Aşağıdaki örneklerden bazıları, başlangıç paketini [Quick start](../quickstart/quickstart.md) bölümünde başarıyla başlatmış olduğunuzu varsayar. Bu başlangıç paketinden, SubQuery projenizi özelleştirmek ve uygulamak için standart süreçten geçeceğiz.

1. Initialise your project using `subql init --specVersion 0.2.0 PROJECT_NAME`. alternatively you can use the old spec version `subql init PROJECT_NAME`
2. Manifest dosyasını (`project.yaml`) blok zinciriniz ve eşleyeceğiniz varlıklar hakkında bilgi içerecek şekilde güncelleştirin - bkz [Manifest File](./manifest.md)
3. Şemanızda (`schema.graphql`) ayıklayacağınız ve sorgulamak için sürdüreceğiniz verilerin şeklini tanımlayan GraphQL varlıkları oluşturun - bkz [GraphQL Şeması](./graphql.md)
4. Zincir verilerini tanımladığınız GraphQL varlıklarına dönüştürmek için çağırmak istediğiniz tüm eşleme işlevlerini (örneğin`mappingHandlers.ts`) ekleyin - bkz[Mapping](./mapping.md)
5. Kodunuzu SubQuery Projects oluşturun, oluşturun ve yayımlayın (veya kendi yerel düğümünüzde çalıştırın) - hızlı başlangıç kılavuzumuzda [ Starter Projenizi Çalıştırma ve Sorgulama](./quickstart.md#running-and-querying-your-starter-project) bakın.

## Dizin Yapısı

Aşağıdaki eşleme, `init` komutu çalıştırıldığında, Bir SubQuery projesinin dizin yapısına genel bir bakış sağlar.

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
  L .gitignore
```

Mesela:

![SubQuery dizin yapısı](/assets/img/subQuery_directory_stucture.png)

## Kod Oluşturma

GraphQL varlıklarınızı her değiştirdiğinizde, türler dizininizi aşağıdaki komutla yeniden değiştirmeniz gerekir.

```
yarn codegen
```

Bu, daha önce `schema.graphql` tanımladığınız her tür için oluşturulan varlık sınıflarını içeren yeni bir dizin (veya varolan) `src/types` oluşturur. Bu sınıflar varlık alanlarına tür açısından güvenli varlık yükleme, okuma ve yazma erişimi sağlar - [ GraphQL Şeması](./graphql.md) bu işlem hakkında daha fazla bilgi edinin.

## Yapmak

SubQuery Project yerel olarak barındırılan bir SubQuery Node çalıştırmak için önce çalışmanızı oluşturmanız gerekir.

Yapı komutunu projenin kök dizininden çalıştırın.

<CodeGroup> <CodeGroupItem title="YARN" active> ```shell yarn build ``` </CodeGroupItem>
<CodeGroupItem title="NPM"> ```bash npm run-script build ``` </CodeGroupItem> </CodeGroup>

## ünlüğe kaydetme

The `console.log` yöntemi **artık desteklenmiyor**. Bunun yerine, türlere `logger` modülü eklenmiştir, bu da çeşitli günlük düzeylerini kabul edebilecek bir günlükçü destekleyebileceğimiz anlamına gelir.

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

`logger.info` veya `logger.warn` kullanmak için, satırı eşleme dosyanıza yerleştirmeniz yeterlidir.

![logging.info](/assets/img/logging_info.png)

`logger.debug` kullanmak için ek bir adım gerekir. Komut satırınıza `--log-level=debug` ekleyin.

Docker kapsayıcısı çalıştırıyorsanız, bu satırı `docker-compose.yaml` dosyanıza ekleyin.

![logging.debug](/assets/img/logging_debug.png)

Şimdi terminal ekranında yeni günlüğe kaydetmeyi görmeniz gerekir.

![logging.debug](/assets/img/subquery_logging.png)
