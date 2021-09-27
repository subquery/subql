# Bildirim Dosyası

Manifest `project.yaml` dosyası projenizin giriş noktası olarak görülebilir ve SubQuery'nin zincir verilerini nasıl dizine alacağı ve dönüştüreceğine ilişkin ayrıntıların çoğunu tanımlar.

Bildirim YAML veya JSON biçiminde olabilir. Bu belgede, tüm örneklerde YAML kullanacağız. Aşağıda temel `project.yaml` standart bir örneği verilmiştir.

``` yml
specVersion: "0.0.1"
açıklama: ""
depo: "https://github.com/subquery/subql-starter"

şema: "./schema.graphql"

ağ:
  uç nokta: "wss://polkadot.api.onfinality.io/public-ws"
  # İsteğe bağlı olarak, işlemeyi hızlandırmak için tam zincir sözlüğün HTTP uç noktasını sağlayın
  sözlük: "https://api.subquery.network/sq/subquery/dictionary-polkadot"  veri Kaynakları:
  - adı: ana
    tür: substrat/Çalışma Zamanı
    startBlock: 1
    eşleme:
      Işleyici:
        - işleyici: handleBlock
          tür: substrat/BlockHandler
        - işleyici: handleEvent
          tür: substrat/EventHandler
          filtre: #Filter isteğe bağlıdır, ancak olay işlemeyi hızlandırması önerilir
            modül: dengeler
            yöntem: Depozito
        - işleyici: handleCall
          tür: substrat/CallHandler
```

- `network.endpoint`, dizine eklenecek blok zincirinin wss veya ws uç noktasını tanımlar - **Bu tam bir arşiv düğümü olmalıdır**.
- `network.dictionary` isteğe bağlı olarak işlemeyi hızlandırmak için tam zincir sözlüğün HTTP uç noktasını sağlar - bkz[ Indexer çalıştırma](../tutorials_examples/dictionary.md).
- `dataSources` filtre uygulanacak ve ayıklanacak verileri ve uygulanacak veri dönüşümü için eşleme işlevi işleyicisinin konumunu tanımlar.
  - `kind` şimdilik yalnızca `substrate/Runtime` destekler.
  - `startBlock` dizine eklenmeye başlanmasının blok yüksekliğini belirtir.
  - `filter`, ağ uç noktası belirtimi adına göre yürütülecek veri kaynağına filtre uygular, bkz <>1>network filtreleri</a>
  - `mapping.handlers` tüm [mapping işlevlerini](./mapping.md) ve bunlara karşılık gelen işleyici türlerini ek [mapping filtreleri](#mapping-filters) ile listeler.

## Ağ Filtreleri

Genellikle kullanıcı bir SubQuery oluşturur ve bunu hem testnet hem de mainnet ortamları (örneğin Polkadot ve Kusama) için yeniden kullanmayı bekler. Ağlar arasında, çeşitli seçeneklerin farklı olması muhtemeldir (örneğin, dizin başlangıç bloğu). Bu nedenle, kullanıcıların her veri kaynağı için farklı ayrıntılar tanımlamasına izin veririz, bu da bir SubQuery projesinin birden çok ağda hala kullanılabileceği anlamına gelir.

Kullanıcılar, her ağda hangi veri kaynağının çalıştıracağına karar vermek için `dataSources` `filter` ekleyebilir.

Aşağıda, hem Polkadot hem de Kusama ağları için farklı veri kaynaklarını gösteren bir örnek verilmiştir.

```yaml
...
ağ:
  uç nokta: "wss://polkadot.api.onfinality.io/public-ws"

Artıklığı önlemek için şablon #Create
tanımlar:
  eşleme: &
    Işleyici:
      - işleyici: handleBlock
        tür: substrat/BlockHandlerveri Kaynakları:
  - adı: polkadotRuntime
    tür: substrat/Çalışma Zamanı
    filtre: #Optional
        specName: polkadot
    startBlock: 1000
    haritalama: *mymapping #use şablonu burada
  - adı: kusamaRuntime
    tür: substrat/Çalışma Zamanı
    filtre: 
        specName: kusama
    startBlock: 12000 
    eşleme: *mymapping # yeniden kullanabilir veya değiştirebilir
```

## Eşleme Filtreleri

Eşleme filtreleri, hangi bloğun, olayın veya dış öğenin bir eşleme işleyicisini tetikleyeceğine karar vermek için son derece kullanışlı bir özelliktir.

Yalnızca filtre koşullarını karşılayan gelen veriler eşleme işlevleri tarafından işlenir. Eşleme filtreleri isteğe bağlıdır, ancak SubQuery projeniz tarafından işlenen veri miktarını önemli ölçüde azalttıkları ve dizin oluşturma performansını artıracakları için önerilir.

```yaml
Çağrı Işleyicisi'nden #Example filtresi
filtre: 
   modül: dengeler
   yöntem: Depozito
   başarı: true
```

Aşağıdaki tabloda, farklı işleyiciler tarafından desteklenen filtreler açıklanmaktadır.

| Işleyicisi                                    | Desteklenen filtre          |
| --------------------------------------------- | --------------------------- |
| [Blok işleyicisi](./mapping.md#block-handler) | `spec Sürümü`               |
| [Olay İşleyicisi](./mapping.md#event-handler) | `module`,`method`           |
| [Çağrı Işleyicisi](./mapping.md#call-handler) | `module`,`method` ,`sasası` |


-  Modül ve yöntem filtreleri herhangi bir substrat tabanlı zincirde desteklenir.
- `success` filtresi bir boole değeri alır ve dış çizgiyi başarı durumuna göre filtrelemek için kullanılabilir.
- `specVersion` filtresi, bir substrat bloğunun belirtim sürüm aralığını belirtir. Aşağıdaki örneklerde sürüm aralıklarının nasıl ayarlandırılacağı açıklanmaktadır.

```yaml
filtre:
  specVersion: [23, 24] #Index blok ile specVersion 23 ile 24 (dahil) arasında.
  specVersion: [100] #Index bloğu specVersion büyük veya eşit 100.
  specVersion: [null, 23] #Index bloğu specVersion küçük veya eşit 23.
```

## Özel Zincirler

`project.yaml` zincir türlerini de dahil larak özel zincirlerden veri dizine ekleyebilirsiniz. Bu blok zinciri tarafından desteklenen belirli türleri `network.types` bildirin. Substrat çalışma zamanı modülleri tarafından kullanılan ek türleri destekliyoruz.

`typesAlias`, `typesBundle`, `typesChain` ve `typesSpec` da desteklenir.

``` yml
specVersion: "0.0.1"
açıklama: "Bu subquery Kitty'nin doğum bilgilerini dizine alır"
depo: "https://github.com/onfinality-io/subql-examples"
şema: "./schema.graphql"
ağ:
  uç nokta: "ws://host.kittychain.io/public-ws"
  türleri: {
    "KittyIndex": "u32",
    "Kedicik": "[u8; 16]"
  }# typesChain: { zincir: { Type5: 'example' } }
# typesSpec: { spec:  { Type6: 'example' } }
veri Kaynakları:
  - adı: çalışma zamanı
    tür: substrat/Çalışma Zamanı
    startBlock: 1
    filtre: #Optional
      specName: kitty-chain 
    eşleme:
      Işleyici:
        - işleyici: handleKittyBred
          tür: substrat/CallHandler
          filtre:
            modül: kedicikler
            yöntem: cins
            başarı: true
```
