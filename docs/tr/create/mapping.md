# Eşleme

Eşleme işlevleri, zincir verilerinin daha önce `schema.graphql` dosyasında tanımladığımız optimize edilmiş GraphQL varlıklarına nasıl dönüştürüleceğini tanımlar.

Eşlemeler, WASM'ye (WebAssembly) derlenebilen AssemblyScript adlı TypeScript'in bir alt kümesine yazılır.
- Eşlemeler `src/mappings` dizininde tanımlanır ve işlev olarak verilir
- Bu eşlemeler ayrıca `src/index.ts` olarak da verilir
- Eşleme dosyaları, eşleme işleyicileri altında `project.yaml` başvurudur.

Eşleme işlevlerinin üç sınıfı vardır; [Block handlers](#block-handler), [Event Handlers](#event-handler) ve [Call Handlers](#call-handler).

## Blok işleyicisi

Alt tabaka zincirine her yeni blok eklendiğinde bilgi yakalamak için blok işleyicilerini kullanabilirsiniz. Bunu başarmak için, tanımlanan bir BlockHandler her blok için bir kez çağrılır.

```ts
import {SubstrateBlock} from "@subql/types";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    // Create a new StarterEntity with the block hash as it's ID
    const record = new starterEntity(block.block.header.hash.toString());
    record.field1 = block.block.header.number.toNumber();
    await record.save();
}
```

[Substrate Block](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L16), [signedBlock](https://polkadot.js.org/docs/api/cookbook/blocks/) genişletilmiş bir arabirim türüdür, ancak `spec Version` ve `timestamp` içerir.

## Olay İşleyicisi

Belirli olaylar yeni bir bloğa eklendiğinde bilgi yakalamak için olay işleyicilerini kullanabilirsiniz. Varsayılan Substrat çalışma zamanının ve bir bloğun parçası olan olaylar birden çok olay içerebilir.

İşlem sırasında, olay işleyicisi, olayın yazılan girişleri ve çıktılarıyla bağımsız değişken olarak bir alt tabaka olayı alır. Her türlü olay eşlemeyi tetikleyerek veri kaynağıyla etkinliğin yakalanmasına izin verir. Verileri dizine alma süresini azaltmak ve eşleme performansını artırmak için olayları filtrelemek için bildiriminizde [Mapping Filters](./manifest.md#mapping-filters) kullanmalısınız.

```ts
mport {SubstrateEvent} from "@subql/types";

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, balance]}} = event;
    // Retrieve the record by its ID
    const record = new starterEntity(event.extrinsic.block.block.header.hash.toString());
    record.field2 = account.toString();
    record.field3 = (balance as Balance).toBigInt();
    await record.save();
```

[SubstrateEvent](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L30) [Event Record](https://github.com/polkadot-js/api/blob/f0ce53f5a5e1e5a77cc01bf7f9ddb7fcf8546d11/packages/types/src/interfaces/system/types.ts#L149) genişletilmiş arabirim türüdür. Olay verilerinin yanı sıra, bir `id` (bu olayın ait olduğu blok) ve bu bloğun dışsal iç kısmını da içerir.

## Çağrı Işleyicisi

Çağrı işleyicileri, belirli substrat dış değerleri hakkında bilgi yakalamak istediğinizde kullanılır.

```ts
export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field4 = extrinsic.block.timestamp;
    await record.save();
}
```

[SubstrateExtrinsic](https://github.com/OnFinality-io/subql/blob/a5ab06526dcffe5912206973583669c7f5b9fdc9/packages/types/src/interfaces.ts#L21), [GenericExtrinsic](https://github.com/polkadot-js/api/blob/a9c9fb5769dec7ada8612d6068cf69de04aa15ed/packages/types/src/extrinsic/Extrinsic.ts#L170)'i genişletir. Bir `id` (bu dış öğenin ait olduğu blok) atanır ve olayları bu blok arasında genişleten dışsal bir özellik sağlar. Ayrıca, bu dışsal başarı durumunu kaydeder.

## Sorgu Durumları
Amacımız, işleyicileri eşlemek için kullanıcılar için tüm veri kaynaklarını kapsamaktır (yukarıdaki üç arabirim olay türünden daha fazlası). Bu nedenle, yetenekleri artırmak için @polkadot /api arabirimlerinden bazılarını kullanıma açtık.

Şu anda desteklediğimiz arayüzler şunlardır:
- [api.query. &lt;module&gt;. &lt;method&gt;()](https://polkadot.js.org/docs/api/start/api.query) <strong>current</strong> bloğunu sorgular.
- [api.query. &lt;module&gt;. &lt;method&gt;.multi()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-same-type) geçerli blokta <strong>same</strong> türünde birden çok sorgu yapar.
- [api.queryMulti()](https://polkadot.js.org/docs/api/start/api.query.multi/#multi-queries-distinct-types) geçerli blokta <strong>different</strong> türlerinin birden çok sorgusunu yapar.

Şu anda desteklediğimiz **NOT** arabirimler şunlardır:
- ~~api.tx.*~~
- ~~api.derive.*~~
- ~~api. sorgu. &lt;module&gt;. &lt;method&gt;.at~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesAt~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.entriesPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.hash~~
- ~~api.query. &lt;module&gt;. &lt;method&gt;.keys At ~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.keysPaged~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.range~~
- ~~api.query.&lt;module&gt;.&lt;method&gt;.sizeAt~~

Bu API' [validator-threshold](https://github.com/subquery/tutorials-validator-threshold) örnek kullanım örneğimizde kullanma örneğine bakın.

## RPC çağrıları

Ayrıca, eşleme işlevinin gerçek düğüm, sorgu ve gönderim ile etkileşime girmesine izin veren uzaktan çağrılar olan bazı API RPC yöntemlerini de destekliyoruz. SubQuery'nin temel öncülü, deterministik olmasıdır ve bu nedenle sonuçları tutarlı tutmak için yalnızca geçmiş RPC çağrılarına izin veririz.

[JSON-RPC](https://polkadot.js.org/docs/substrate/rpc/#rpc) belgeler giriş parametresi olarak `BlockHash` alan bazı yöntemler sağlar (örneğin, `at?: BlockHash`). Bu yöntemleri, varsayılan olarak geçerli dizin oluşturma bloğu karmasını alacak şekilde de değiştirdik.

```typescript
// Diyelim ki şu anda bu karma numaraya sahip bir bloğu dizine ekleniyoruz
const blockhash = `0x844047c4cf1719ba6d54891e92c071a41e3dfe789d064871148e9d41ef086f6a`;

// Özgün yöntemin isteğe bağlı girişi vardır: blok karma
const b1 = await api.rpc.chain.getBlock(blockhash);

// Geçerli bloğun varsayılan olarak böyle olduğunu kullanır
const b2 = await api.rpc.chain.getBlock();
```
- [Özel Substrat Zincirleri](#custom-substrate-chains) RPC çağrıları için [kullanım](#usage) konusuna bakın.

## Modüller ve Kitaplıklar

SubQuery'nin veri işleme yeteneklerini geliştirmek için, NodeJS'in [sandbox](#the-sandbox) eşleme işlevlerini çalıştırmak için yerleşik modüllerinden bazılarına izin verdik ve kullanıcıların üçüncü taraf kitaplıkları aramasına izin verdik.

Bunun ** deneysel bir özellik olduğunu unutmayın** ve eşleme işlevlerinizi olumsuz yönde etkileyebilecek hatalar veya sorunlarla karşılaşabilirsiniz. Lütfen [GitHub](https://github.com/subquery/subql) bir sorun oluşturarak bulduğunuz hataları bildirin.

### Yerleşik modüller

Şu anda, aşağıdaki NodeJS modüllerine izin <: `assert`, `buffer`, `crypto`, `util` ve `path`.

Modülün tamamını almak yerine, yalnızca ihtiyacınız olan gerekli yöntemleri almanızı öneririz. Bu modüllerdeki bazı yöntemlerin desteklenmeyen bağımlılıkları olabilir ve alma işlemi başarısız olur.

```ts
import {hashMessage} from "ethers/lib/utils"; //Good way
import {utils} from "ethers" //Bad way

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const record = new starterEntity(extrinsic.block.block.header.hash.toString());
    record.field1 = hashMessage('Hello');
    await record.save();
}
```

### Üçüncü taraf kitaplıkları

Sanal makinenin sanal alanımızdaki sınırlamaları nedeniyle, şu anda yalnızca **CommonJS** tarafından yazılmış üçüncü taraf kitaplıkları destekliyoruz.

Ayrıca, varsayılan olarak ESM kullanan `@polkadot/*` gibi **hybrid** bir kitaplığı da destekliyoruz. Ancak, başka kitaplıklar **ESM** biçimindeki modüllere bağımlıysa, sanal makine **değİl** derlenir ve bir hata döndürür.

## Özel Substrat Zincirleri

SubQuery, sadece Polkadot veya Kusama'da değil, substrat tabanlı herhangi bir zincirde kullanılabilir.

Özel bir Substrat tabanlı zincir kullanabilirsiniz ve [@polkadot/typegen](https://polkadot.js.org/docs/api/examples/promise/typegen/) kullanarak türleri, arabirimleri ve ek yöntemleri otomatik olarak içe aktarmak için araçlar sağlıyoruz.

Aşağıdaki bölümlerde, entegrasyon sürecini açıklamak için [kitty example](https://github.com/subquery/tutorials-kitty-chain) kullanıyoruz.

### Hazırlık

Gerekli ve oluşturulan tüm dosyaları depolamak için proje `src/0> klasörü altında yeni bir dizin <code>api-interfaces` oluşturun. Ayrıca, api'ye `kitties` modülünden dekorasyon eklemek istediğimiz için `api-interfaces/kitties` dizini oluşturuyoruz.

#### Meta veriler

Gerçek API uç noktalarını oluşturmak için meta verilere ihtiyacımız var. Kitty örneğinde, yerel bir testnetinden bir uç nokta kullanırız ve ek türler sağlar. Düğümün meta verilerini **HTTP** uç noktasından almak için [PolkadotJS meta veri kurulumu](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup)'daki adımları izleyin.

```shell
curl -H "Content-Type: application/json" -d '{"id":"1", "jsonrpc":"2.0", "method": "state_getMetadata", "params":[]}' http://localhost:9933
```
veya **websocket** uç noktasından [`websocat`](https://github.com/vi/websocat) yardımıyla:

```shell
//Websocat'i yükleme
brew install websocat

//Meta verileri alma
echo state_getMetadata | websocat 'ws://127.0.0.1:9944' --jsonrpc
```

Ardından, çıktıyı kopyalayıp bir JSON dosyasına yapıştırın. [kitty örneğimizde](https://github.com/subquery/tutorials-kitty-chain), `api-interface/kitty.json` oluşturduk.

#### Tür tanımları
Kullanıcının zincirden belirli türleri ve RPC desteğini bildiğini ve [Manifest](./manifest.md) tanımlandığını varsayıyoruz.

[types setup](https://polkadot.js.org/docs/api/examples/promise/typegen#metadata-setup) aşağıdakileri oluştururuz:
- `src/api-interfaces/definitions.ts` - bu, tüm alt klasör tanımlarını dışa aktarıyor

```ts
export { default as kitties } from './kitties/definitions';
```

- `src/api-interfaces/kitties/definitions.ts` - kitties modülü için tür tanımları
```ts
export default {
    // custom types
    types: {
        Address: "AccountId",
        LookupSource: "AccountId",
        KittyIndex: "u32",
        Kitty: "[u8; 16]"
    },
    // custom rpc : api.rpc.kitties.getKittyPrice
    rpc: {
        getKittyPrice:{
            description: 'Get Kitty price',
            params: [
                {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                },
                {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                }
            ],
            type: 'Balance'
        }
    }
}
```

#### Paket

- `package.json` dosyasına, geliştirme bağımlılığı olarak `@polkadot/typegen` ve normal bir bağımlılık olarak `@polkadot/api` eklediğinizden emin olun ( ideal olarak aynı sürüm). Ayrıca, komut dosyalarını çalıştırmamıza yardımcı olmak için geliştirme bağımlılığı olarak `ts-node` ihtiyacımız vardır.
- Her iki türü de çalıştırmak için komut dosyaları ekliyoruz; `generate:defs` ve meta veri `generate:meta` üreteçleri (bu sırada, meta veriler türleri kullanabilir).

İşte `package.json` basitleştirilmiş bir sürümü. **scripts** bölümünde paket adının doğru olduğundan ve dizinlerin geçerli olduğundan emin olun.

```json
{
  "name": "kitty-birthinfo",
  "scripts": {
    "generate:defs": "ts-node --skip-project node_modules/.bin/polkadot-types-from-defs --package kitty-birthinfo/api-interfaces --input ./src/api-interfaces",
    "generate:meta": "ts-node --skip-project node_modules/.bin/polkadot-types-from-chain --package kitty-birthinfo/api-interfaces --endpoint ./src/api-interfaces/kitty.json --output ./src/api-interfaces --strict"
  },
  "dependencies": {
    "@polkadot/api": "^4.9.2"
  },
  "devDependencies": {
    "typescript": "^4.1.3",
    "@polkadot/typegen": "^4.9.2",
    "ts-node": "^8.6.2"
  }
}
```

### Tür oluşturma

Hazırlık tamamlandıktan sonra, türler ve meta veriler oluşturmaya hazırız. Aşağıdaki komutları çalıştırın:

```shell
# Yeni bağımlılıklar yüklemek için iplik
yarn

# Türler oluştur
yarn generate:defs
```

In each modules folder (eg `/kitties`), there should now be a generated `types.ts` that defines all interfaces from this modules' definitions, also a file `index.ts` that exports them all.

```shell
# Meta veriler oluştur
yarn generate:meta
```

Bu komut meta verileri ve API'ler için yeni bir api-augment oluşturur. Yerleşik API'yi kullanmak istemediğimiz için, `tsconfig.json` açık bir geçersiz kılma ekleyerek bunları değiştirmemiz gerekecektir. Güncelleştirmelerden sonra, yapılandırmadaki yollar şöyle görünecektir (açıklamalar olmadan):

```json
{
  "compilerOptions": {
      // Bu, kullandığımız paket adıdır (arayüz içe aktarmalarında, --jeneratörler için paket) */
      "kitty-birthinfo/*": ["src/*"],
     // Burada @polkadot/api büyütmeyi zincirden oluşturulan kendi büyütmemizle değiştiriyoruz
      "@polkadot/api/augment": ["src/interfaces/augment-api.ts"],
     // tanımlardan oluşturulan artırılmış türleri kendi türlerimizle değiştirin
      "@polkadot/türleri/büyütme": ["src/interfaces/augment-types.ts"]
    }
}
```

### Kullanım

Şimdi eşleme işlevinde, meta verilerin ve türlerin API'yi gerçekte nasıl dekore ederek süslediğini gösterebiliriz. RPC uç noktası yukarıda beyan ettiğimiz modülleri ve yöntemleri destekleyecektir. Ve özel rpc çağrısı kullanmak için, lütfen bölüme bakın [Özel zincir rpc çağrıları](#custom-chain-rpc-calls)
```typescript
export async function kittyApiHandler(): Promise<void> {
    //KittyIndex türünü döndürme
    const nextKittyId = await api.query.kitties.nextKittyId();
   //Kitty türünü döndürür, giriş parametreleri türleri AccountId ve KittyIndex'tir
    const allKitties  = await api.query.kitties.kitties('xxxxxxxxx',123)
    logger.info(`Next kitty id ${nextKittyId}`)
    //Özel rpc, tanımsız olarak blockhash olarak ayarla
    const kittyPrice = await api.rpc.kitties.getKittyPrice(undefined,nextKittyId);
}
```

**Bu projeyi gezginimize yayınlamak istiyorsanız, lütfen oluşturulan dosyaları `src/api-interfaces` ekleyin.**

### Özel zincir rpc çağrıları

Özelleştirilmiş zincir RPC çağrılarını desteklemek için, `typesBundle` için RPC tanımlarını el ile eklemeli ve her belirti için yapılandırmaya izin vermeliyiz. `project.yml<` `typesBundle` tanımlayabilirsiniz. Ve lütfen yalnızca `isHistoric` tür çağrıların desteklendiğini unutmayın.
```yaml
...
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]",
  }
  typesBundle: {
    spec: {
      chainname: {
        rpc: {
          kitties: {
            getKittyPrice:{
                description: string,
                params: [
                  {
                    name: 'at',
                    type: 'BlockHash',
                    isHistoric: true,
                    isOptional: false
                  },
                  {
                    name: 'kittyIndex',
                    type: 'KittyIndex',
                    isOptional: false
                  }
                ],
                type: "Balance",
            }
          }
        }
      }
    }
  }

```
