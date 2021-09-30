# SubQuery'ları Yerel Olarak Çalıştırma

Bu kılavuz, hem dizinleyiciyi hem de sorgu hizmetini içeren altyapınızda yerel bir SubQuery düğümünün nasıl çalıştırılacağı üzerinde çalışır. Kendi SubQuery altyapınızı çalıştırma konusunda endişelenmek istemiyor musunuz? SubQuery, topluluğa ücretsiz olarak [](https://explorer.subquery.network) barındırılan bir hizmet sunar. [Follow our publishing guide](../publish/publish.md) to see how you can upload your project to [SubQuery Projects](https://project.subquery.network).

## Docker'ı kullanma

Alternatif bir çözüm, `>docker-compose.yml` dosyası tarafından tanımlanan <strong>Docker Container</strong> çalıştırmaktır. Yeni başlanmış yeni bir proje için burada hiçbir şeyi değiştirmenize gerek kalmayacak.

Proje dizininin altında aşağıdaki komutu çalıştırın:

```shell
docker-compose pull && docker-compose up
```

Gerekli paketleri ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) ve Postgres) ilk kez indirmek biraz zaman alabilir, ancak yakında çalışan bir SubQuery düğümü görürsünüz.

## Dizinleyici çalıştırma (subql/node)

Gereksinim -leri:

- [Postgres](https://www.postgresql.org/) database (sürüm 12 veya üstü). [SubQuery node](#start-a-local-subquery-node) blok zincirini dizine alırken, çıkarılan veriler harici bir veritabanı örneğinde depolanır.

SubQuery düğümü, SubQuery projesi başına substrat tabanlı blok zinciri verilerini ayıklayan ve postgres veritabanına kaydeden bir uygulamadır.

### Kurma

```shell
# NPM
npm install -g @subql/node
```

Lütfen **DO NOT**, zayıf bağımlılık yönetimi nedeniyle `yarn global` kullanımını teşvik ettiğimizi ve bunun da bir hataya yol açabileceğini unutmayın.

Yüklendikten sonra, aşağıdaki komutla bir düğüm başlatabilirsiniz:

```shell
subql-node <command>
```

### Anahtar Komutlar

Aşağıdaki komutlar, bir SubQuery node yapılandırmasını tamamlamanıza ve dizine eksemeye başlamanıza yardımcı olur. Daha fazla şey öğrenmek için her zaman `--help` çalıştırabilirsiniz.

#### Yerel proje yolunun göster

```
subql-node -f proje-yolunuz
```

#### Sözlük Kullanma

Tam zincir sözlüğü kullanmak, test sırasında veya ilk dizininiz sırasında bir SubQuery projesinin işlenmesini önemli ölçüde hızlandırabilir. Bazı durumlarda, 10 kata kadar endeksleme performansı artışları gördük.

Tam zincir sözlüğü, belirli bir zincir içindeki tüm olayların ve dışsal öğelerin konumunu önceden dizine dizine işaretler ve düğüm hizmetinizin her bloğu incelemek yerine dizine alırken ilgili konumlara atlamasını sağlar.

Sözlük uç noktasını `project.yaml` dosyanıza ekleyebilirsiniz (bkz. [Manifest File](../create/manifest.md)) veya aşağıdaki komutu kullanarak çalışma zamanında belirtebilirsiniz:

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[Read more about how a SubQuery Dictionary works](../tutorials_examples/dictionary.md).

#### Veritabanına bağlanma

```
dB_USER=postgres dışa aktarma
DB_PASS=postgres dışa aktarma
dışa aktarma DB_DATABASE=postgres
DB_HOST=localhost ver
dışa aktarma DB_PORT=5432
subql-node -f proje-yolunuz 
````

Postgres veritabanınızın yapılandırmasına (örneğin, farklı bir veritabanı parolası) bağlı olarak, lütfen hem dizin oluşturucunun ('subql/node') hem de sorgu hizmetinin ('subql/query') ona bir bağlantı kurabildiğinden emin olun.

#### Yapılandırma dosyası belirtme

```
subql-node -c projeniz-config.yml
```

Bu, query node YAML veya JSON biçiminde olabilecek bir yapılandırma dosyasına yönlendirecektir. Lütfen aşağıdaki örneğe bakın.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Blok getirme toplu iş boyutunu değiştirme

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

Dizinleyici zinciri ilk dizine aldığında, tek blokları getirmek performansı önemli ölçüde düşürecektir. Getirilen blok sayısını ayarlamak için toplu iş boyutunu artırmak genel işlem süresini azaltır. Geçerli varsayılan toplu iş boyutu 100'dür.

#### Yerel mod

```
subql-node -f your-project-path --local
```

Hata ayıklama amacıyla, kullanıcılar düğümü yerel modda çalıştırabilir. Yerel modele geçiş, varsayılan şemada postgres tabloları `public` oluşturur.

Yerel mod kullanılmazsa, ilk `subquery_` ve karşılık gelen proje tablolarına sahip yeni bir Postgres şeması oluşturulur.


#### Node sağlığı kontrol ediliyor

Çalışan bir SubQuery node düğümünün durumunu denetlemek ve izlemek için kullanabileceğiniz 2 uç nokta vardır.

- Health check endpoint that returns a simple 200 response
- Metadata endpoint that includes additional analytics of your running SubQuery node

Append this to the base URL of your SubQuery node. Eg `http://localhost:3000/meta` will return:

```bash
{
    "currentProcessingHeight": 1000699,
    "currentProcessingTimestamp": 1631517883547,
    "targetHeight": 6807295,
    "bestHeight": 6807298,
    "indexerNodeVersion": "0.19.1",
    "lastProcessedHeight": 1000699,
    "lastProcessedTimestamp": 1631517883555,
    "uptime": 41.151789063,
    "polkadotSdkVersion": "5.4.1",
    "apiConnected": true,
    "injectedApiConnected": true,
    "usingDictionary": false,
    "chain": "Polkadot",
    "specName": "polkadot",
    "genesisHash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    "blockTime": 6000
}
```

`http://localhost:3000/health` will return HTTP 200 if successful.

A 500 error will be returned if the indexer is not healthy. This can often be seen when the node is booting up.

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

If an incorrect URL is used, a 404 not found error will be returned.

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### Debug your project

Use the [node inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/) to run the following command.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

For example:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
Then open up the Chrome dev tools, go to Source > Filesystem and add your project to the workspace and start debugging. For more information, check out [How to debug a SubQuery project](https://doc.subquery.network/tutorials_examples/debug-projects/)
## Running a Query Service (subql/query)

### Installation

```shell
# NPM
npm install -g @subql/query
```

Please note that we **DO NOT** encourage the use of `yarn global` due to its poor dependency management which may lead to an errors down the line.

### Running the Query service
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Make sure the project name is the same as the project name when you [initialize the project](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Also, check the environment variables are correct.

After running the subql-query service successfully, open your browser and head to `http://localhost:3000`. You should see a GraphQL playground showing in the Explorer and the schema that is ready to query.
