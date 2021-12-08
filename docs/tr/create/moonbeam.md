# Moonbeam EVM Desteği

Moonbeam'in ve Moonriver'ın EVM'si için özel bir veri kaynağı işlemcisi sağlıyoruz. Bu, tek bir SubQuery projesi içinde Moonbeam ağlarındaki hem EVM hem de Substrat etkinliğini filtrelemek ve indekslemek için basit bir yol sunar.

Desteklenen ağlar:

| Ağ Adı         | Websocket Bitim Noktası                            | Sözlük Bitim Noktası                                                 |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Moonbeam       | _Çok yakında_                                      | _Çok yakında_                                                        |
| Moonriver      | `wss://moonriver.api.onfinality.io/public-ws`      | `https://api.subquery.network/sq/subquery/moonriver-dictionary`      |
| Moonbase Alpha | `wss://moonbeam-alpha.api.onfinality.io/public-ws` | `https://api.subquery.network/sq/subquery/moonbase-alpha-dictionary` |

**Ayrıca bir olay ve çağrı işleyici ile
temel Moonriver EVM örnek projesine de başvurabilirsiniz. Bu proje ayrıca burada SubQuery Gezgini'nde canlı olarak barındırılmaktadır.</p> 



## Başlarken

1. Özel veri kaynağını bir bağımlılık olarak ekleyin `yarn @subql/contract-processors` ekleyin
2. Aşağıda açıklandığı gibi özel bir veri kaynağı ekleyin
3. Kodunuza özel veri kaynağı için işleyiciler ekleyin



## Veri Kaynağı Spesifikasyonu

| Alan              | Tip                                                            | Gerekli | Açıklama                               |
| ----------------- | -------------------------------------------------------------- | ------- | -------------------------------------- |
| processor.file    | `'./node_modules/@subql/contract-processors/dist/moonbeam.js'` | Evet    | Veri işlemci koduna dosya referansı    |
| processor.options | [ProcessorOptions](#processor-options)                         | Hayır   | Moonbeam İşlemciye özel seçenekler     |
| varlıklar         | `{ [key: String]: { file: String }}`                           | Hayır   | Harici varlık dosyalarının bir nesnesi |




### İşlemci Seçenekleri

| Alan  | Tip              | Gerekli | Açıklama                                                                                                          |
| ----- | ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| abi   | String           | Hayır   | İşlemci tarafından argümanları ayrıştırmak için kullanılan ABI. `varlıkların` anahtarı OLMALIDIR                  |
| adres | String or `null` | Hayır   | Etkinliğin geldiği veya aramanın yapıldığı bir sözleşme adresi. `null` sözleşme oluşturma çağrılarını yakalayacak |




## MoonbeamCall

Farklı bir işleyici argümanı ve küçük filtreleme değişiklikleri dışında [substrate/CallHandler](../create/mapping/#call-handler) ile aynı şekilde çalışır.

| Alan   | Tip                             | Gerekli | Tarif                                             |
| ------ | ------------------------------- | ------- | ------------------------------------------------- |
| tür    | 'substrate/MoonbeamCall'        | Evet    | Bunun bir Çağrı türü işleyicisi olduğunu belirtir |
| filtre | [Çağrı Filtresi](#call-filters) | Hayır   | Yürütülecek veri kaynağını filtreleyin            |




### Çağrı Filtresi

| Alan      | Tip    | Örnekler                                                | Açıklama                                                                                                                                                           |
| --------- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fonksiyon | String | 0x095ea7b30x095ea7b3, approve(address to,uint256 value) | Sözleşmede çağrılan işlevi filtrelemek için [Fonksiyon İmzası](https://docs.ethers.io/v5/api/utils/abi/fragments/#FunctionFragment) dizeleri veya `sighash` işlevi |
| gönderici | String | 0x6bd193ee6d2104f14f94e2ca6efefae561a4334b              | İşlemi gönderen bir Ethereum adresi                                                                                                                                |




### İşleyiciler

Normal bir işleyiciden farklı olarak, parametre olarak bir `SubstrateExtrinsic` almazsınız, bunun yerine Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) türüne dayalı bir `MoonbeamCall` alırsınız.

`TransactionResponse` türünden değişiklikler:

- `bekle` ve `onaylar `özelliklerine sahip değil
- İşlemin başarılı olup olmadığını öğrenmek için bir `success` özelliği eklendi
- `abi` alanı sağlanmışsa ve bağımsız değişkenler başarıyla ayrıştırılabiliyorsa `args` eklenir



## MoonbeamEvent

Farklı bir işleyici argümanı ve küçük filtreleme değişiklikleri dışında [substrate/CallHandler](../create/mapping/#event-handler) ile aynı şekilde çalışır.

| Alan   | Tip                                 | Gerekli | Tarif                                             |
| ------ | ----------------------------------- | ------- | ------------------------------------------------- |
| tür    | 'substrate/MoonbeamCall'            | Evet    | Bunun bir Çağrı türü işleyicisi olduğunu belirtir |
| filtre | [Etkinlik Filtresi](#event-filters) | Hayır   | Yürütülecek veri kaynağını filtreleyin            |




### Etkinlik filtreleri

| Alan | Tip          | Örnekler                                                       | Tarif                                                                                                                                                  |
| ---- | ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| konu | Dizge dizisi | Transfer(adres indekslendi, adres indekslendi, uint256 değeri) | Konular filtresi, Ethereum JSON-PRC günlük filtrelerini takip eder, daha fazla belge [burada](https://docs.ethers.io/v5/concepts/events/) bulunabilir. |

<b>Konularla ilgili not</b>: Temel günlük filtrelerinde birkaç iyileştirme var:

- Konuların 0 dolgulu olması gerekmez
- [Etkinlik Parçası](https://docs.ethers.io/v5/api/utils/abi/fragments/#EventFragment) dizeleri sağlanabilir ve otomatik olarak kimliklerine dönüştürülebilir



### İşleyiciler

Normal bir işleyiciden farklı olarak, parametre olarak bir `SubstrateExtrinsic` almazsınız, bunun yerine Ethers [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-Log) türüne dayalı bir `MoonbeamCall` alırsınız.

`Günlük türünden` değişiklikler:

- `abi` alanı sağlanmışsa ve bağımsız değişkenler başarıyla ayrıştırılabiliyorsa `args` eklenir



## Veri Kaynağı Örneği

Bu, `project.yaml` bildirim dosyasından bir alıntıdır.



```yaml
dataSources:
  - kind: substrate/Moonbeam
    startBlock: 752073
    processor:
      file: './node_modules/@subql/contract-processors/dist/moonbeam.js'
      options:
        # Must be a key of assets
        abi: erc20
        # Contract address (or recipient if transfer) to filter, if `null` should be for contract creation
        address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
    assets:
      erc20:
        file: './erc20.abi.json'
    mapping:
      file: './dist/index.js'
      handlers:
        - handler: handleMoonriverEvent
          kind: substrate/MoonbeamEvent
          filter:
            topics:
              - Transfer(address indexed from,address indexed to,uint256 value)
        - handler: handleMoonriverCall
          kind: substrate/MoonbeamCall
          filter:
            ## The function can either be the function fragment or signature
            # function: '0x095ea7b3'
            # function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'
            # function: approve(address,uint256)
            function: approve(address to,uint256 value)
            from: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'
```




## Bilinen sınırlamalar

- Şu anda bir işleyici içinde EVM durumunu sorgulamanın bir yolu yok
- Çağrı işleyicilerle işlem makbuzlarını almanın bir yolu yok
- `blockHash` özellikleri şu anda tanımsız bırakılmıştır, bunun yerine `blockNumber` özelliği kullanılabilir
