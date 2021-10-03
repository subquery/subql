# Hello World Açıklandı

[Hello World hızlı başlangıç kılavuzunda](helloworld-localhost.md), bazı basit komutları çalıştırdık ve çok hızlı bir şekilde bir örnek aldık. Bu, tüm önkoşulların yerinde olduğundan ve SubQuery'den ilk verilerinizi almak için basit bir sorgu yapmak için yerel bir oyun alanı kullanabileceğinizden emin olmanızı sağlar. Burada, tüm bu komutların ne anlama geldiğine daha yakından bakıyoruz.

## subql init

Çalıştırdığımız ilk komut `subql init --starter subqlHelloWorld` idi.

Bu ağır kaldırma yapar ve sizin için bir sürü dosya oluşturur. [official documentation](quickstart.md#configure-and-build-the-starter-project) belirtildiği gibi, esas olarak aşağıdaki dosyalar üzerinde çalışacaksınız:

- The Manifest in `project.yaml`
- `schema.graphql`'daki GraphQL Şeması
- `src/mappings/` dizinindeki Eşleme işlevleri

![anahtar subql dosyaları](/assets/img/main_subql_files.png)

Bu dosyalar yaptığımız her şeyin özü. Bu nedenle, başka bir makalede bu dosyalara daha fazla zaman ayıracağız. Şimdilik, şemanın kullanıcıların SubQuery API'sinden isteyebileceği verilerin bir açıklamasını, "yapılandırma" türü parametrelerini içeren proje yaml dosyasını ve elbette verileri dönüştüren işlevleri içeren typescript içeren mappingHandlers'ı içerdiğini bilin.

## yarn install

Bir sonraki yaptığımız şey `yarn install`. `npm yükleme` da kullanılabilir.

> Kısa bir tarih dersi. Node Package Manager veya npm ilk olarak 2010 yılında piyasaya sürüldü ve JavaScript geliştiricileri arasında son derece popüler bir paket yöneticisidir. Node.js sisteminize her yüklediğinizde otomatik olarak yüklenen varsayılan pakettir. İplik ilk olarak 2016 yılında Facebook tarafından npm (o zaman) ile çalışmanın bazı performans ve güvenlik eksikliklerini gidermek amacıyla piyasaya sürüldü.

İpliğin yaptığı şey `package.json` dosyasına bakmak ve diğer çeşitli bağımlılıkları indirmektir. `package.json` dosyasına baktığınızda, çok fazla bağımlılık yok gibi görünüyor, ancak komutu çalıştırdığınızda 18,983 dosyanın eklendiğinde fark edeceksiniz. Bunun nedeni, her bağımlılığın kendi bağımlılıklarının da olmasıdır.

![anahtar subql dosyaları](/assets/img/dependencies.png)

## iplik kodgeni

Daha sonra `yarn codegen` veya `npm run-script codegen` çalıştırdık. Bunun yaptığı şey GraphQL şemasını (`schema.graphql`) getirmek ve ilişkili typescript model dosyalarını oluşturmaktır (bu nedenle çıktı dosyalarının bir .ts uzantısı olacaktır). Oluşturulan bu dosyaların hiçbirini asla değiştirmemelisiniz, yalnızca kaynak `schema.graphql` dosyasını değiştirmelisiniz.

![anahtar subql dosyaları](/assets/img/typescript.png)

## yarn build

`yarn yapı` veya `npm run-script build` yürütüldü. Bu deneyimli programcılar için tanıdık olmalıdır. Dağıtıma hazırlanan kod optimizasyonu gibi şeyleri gerçekleştiren bir dağıtım klasörü oluşturur.

![anahtar subql dosyaları](/assets/img/distribution_folder.png)

## docker-compose

Son adım, birleşik docker komutu `docker-compose pull && docker-compose up` (ayrı olarak da çalıştırılabilir). `pull` komutu Docker Hub'dan gerekli tüm görüntüleri alır ve `up` komutu kapsayıcıyı başlatır.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

Kapsayıcı başlatıldığında, terminalin düğümün ve GraphQL motorunun durumunu gösteren çok sayıda metin tükürdüğünü görürsünüz. İşte o zaman:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

SubQuery düğümünün eşitlemeye başladığını bildiğinizi.

## Özet

Şimdi örtünün altında neler olduğuna dair bir fikir edindiğinize göre, soru buradan nereye? Kendinize güveniyorsanız, [create a project](../create/introduction.md) nasıl oluşturabilirsiniz ve üç anahtar dosya hakkında daha fazla bilgi edinebilirsiniz. Bildirim dosyası, GraphQL şeması ve eşlemeler dosyası.

Aksi takdirde, bu Hello World örneğini SubQuery'nin barındırılan altyapısında nasıl çalıştırabileceğimize baktığımız öğreticiler bölümümüze devam edin, başlangıç bloğunu değiştirmeye bakacağız ve hazır ve açık kaynaklı projeler çalıştırarak SubQuery projelerini çalıştırma konusunda daha derin bir dalış yapacağız.
