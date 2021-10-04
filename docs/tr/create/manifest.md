# Manifest File

Manifest `project.yaml` dosyası projenizin giriş noktası olarak görülebilir ve SubQuery'nin zincir verilerini nasıl dizine alacağı ve dönüştüreceğine ilişkin ayrıntıların çoğunu tanımlar.

Bildirim YAML veya JSON biçiminde olabilir. Bu belgede, tüm örneklerde YAML kullanacağız. Aşağıda temel `project.yaml` standart bir örneği verilmiştir.

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # İsteğe bağlı olarak, işlemeyi hızlandırmak için tam zincir sözlüğün HTTP uç noktasını sağlayın
 dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter isteğe bağlıdır, ancak olay işlemeyi hızlandırması önerilir
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network.endpoint`, dizine eklenecek blok zincirinin wss veya ws uç noktasını tanımlar - **Bu tam bir arşiv düğümü olmalıdır**.
- `network.dictionary` isteğe bağlı olarak işlemeyi hızlandırmak için tam zincir sözlüğün HTTP uç noktasını sağlar - bkz[ Indexer çalıştırma](../tutorials_examples/dictionary.md).
- `dataSources` filtre uygulanacak ve ayıklanacak verileri ve uygulanacak veri dönüşümü için eşleme işlevi işleyicisinin konumunu tanımlar.
  - `kind` şimdilik yalnızca `substrate/Runtime` destekler.
  - `startBlock` dizine eklenmeye başlanmasının blok yüksekliğini belirtir.
  - `filter`, ağ uç noktası belirtimi adına göre yürütülecek veri kaynağına filtre uygular, bkz [network filtreleri](#network-filters)
  - `mapping.handlers` tüm [mapping işlevlerini](./mapping.md) ve bunlara karşılık gelen işleyici türlerini ek [mapping filtreleri](#mapping-filters) ile listeler.

## Ağ Filtreleri

Genellikle kullanıcı bir SubQuery oluşturur ve bunu hem testnet hem de mainnet ortamları (örneğin Polkadot ve Kusama) için yeniden kullanmayı bekler. Ağlar arasında, çeşitli seçeneklerin farklı olması muhtemeldir (örneğin, dizin başlangıç bloğu). Bu nedenle, kullanıcıların her veri kaynağı için farklı ayrıntılar tanımlamasına izin veririz, bu da bir SubQuery projesinin birden çok ağda hala kullanılabileceği anlamına gelir.

Kullanıcılar, her ağda hangi veri kaynağının çalıştıracağına karar vermek için `dataSources` `filter` ekleyebilir.

Aşağıda, hem Polkadot hem de Kusama ağları için farklı veri kaynaklarını gösteren bir örnek verilmiştir.

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Artıklığı önlemek için şablon
definitions:
  mapping: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter: #Optional
       specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use şablonu burada
 - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # yeniden kullanabilir veya değiştirebilir
```

## Eşleme Filtreleri

Eşleme filtreleri, hangi bloğun, olayın veya dış öğenin bir eşleme işleyicisini tetikleyeceğine karar vermek için son derece kullanışlı bir özelliktir.

Yalnızca filtre koşullarını karşılayan gelen veriler eşleme işlevleri tarafından işlenir. Eşleme filtreleri isteğe bağlıdır, ancak SubQuery projeniz tarafından işlenen veri miktarını önemli ölçüde azalttıkları ve dizin oluşturma performansını artıracakları için önerilir.

```yaml
#Example filtresi callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

Aşağıdaki tabloda, farklı işleyiciler tarafından desteklenen filtreler açıklanmaktadır.

| Işleyicisi                                 | Desteklenen filtre           |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |


-  Modül ve yöntem filtreleri herhangi bir substrat tabanlı zincirde desteklenir.
- `success` filtresi bir boole değeri alır ve dış çizgiyi başarı durumuna göre filtrelemek için kullanılabilir.
- `specVersion` filtresi, bir substrat bloğunun belirtim sürüm aralığını belirtir. Aşağıdaki örneklerde sürüm aralıklarının nasıl ayarlandırılacağı açıklanmaktadır.

```yaml
filtre:
  specVersion: [23, 24] #Index bloğu ile specVersion 23 ile 24 (dahil) arasında.
  specVersion: [100] #Index bloğu specVersion büyük veya eşit 100.
  specVersion: [null, 23] #Index bloğu specVersion küçük veya eşit 23.
```

## Özel Zincirler

`project.yaml` zincir türlerini de dahil larak özel zincirlerden veri dizine ekleyebilirsiniz. Bu blok zinciri tarafından desteklenen belirli türleri `network.types` bildirin. Substrat çalışma zamanı modülleri tarafından kullanılan ek türleri destekliyoruz.

`typesAlias`, `typesBundle`, `typesChain` ve `typesSpec` da desteklenir.

``` yml
specVersion: "0.0.1"
description: "This subquery indexes kitty's birth info"
repository: "https://github.com/onfinality-io/subql-examples"
schema: "./schema.graphql"
network:
  endpoint: "ws://host.kittychain.io/public-ws"
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]"
  }
# typesChain: { chain: { Type5: 'example' } }
# typesSpec: { spec: { Type6: 'example' } }
dataSources:
  - name: runtime
    kind: substrate/Runtime
    startBlock: 1
    filter:  #Optional
      specName: kitty-chain 
    mapping:
      handlers:
        - handler: handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
```
