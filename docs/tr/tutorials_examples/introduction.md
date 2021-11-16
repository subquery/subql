# Öğreticiler & Örnekler

Burada öğreticilerimizi listeleyeceğiz ve en kolay ve en hızlı şekilde çalışmaya devam etmenize yardımcı olacak çeşitli örnekleri keşfedeceğiz.

## Öğreticiler



## SubQuery Örnekleri Projeleri

| Örnek                                                                                         | Açıklama                                                                                                                                                    | Konu                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [extrinsic-finalized-block](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | Dizinler, karmaları tarafından sorgulanabilmeleri için dış dizinler                                                                                         | __block handler__ işleviyle en basit örnek                                                                                     |
| [block-timestamp](https://github.com/subquery/tutorials-block-timestamp)                      | Sonlandırılmış her bloğun zaman damgalarını dizine dizine ayırır                                                                                            | Başka bir basit __call handler__ işlevi                                                                                        |
| [validator-threshold](https://github.com/subquery/tutorials-validator-threshold)              | Bir doğrulayıcının seçilmesi için gereken en az staking tutarını dizineler.                                                                                 | Ek zincir üstündeki veriler için `@polkadot/api`'ye __external calls__ gönderen daha karmaşık bir __block handler__ fonksiyonu |
| [sum-reward](https://github.com/subquery/tutorials-sum-reward)                                | Kesinleşmiş blok olaylarından tahvil, ödül ve eğik çizgiler dizinler                                                                                        | __one-to-many__ ilişkisi olan daha karmaşık__event handlers__                                                                  |
| [entity-relation](https://github.com/subquery/tutorials-entity-relations)                     | Hesaplar arasındaki bakiye transferlerini dizine dizinler, ayrıca yardımcı program toplu işlemini de dizine dizinelerTüm çağrıların içeriğini öğrenmek için | __One-to-many__ ve __many-to-many__ ilişkiler ve karmaşık __relationships and complicated__                                    |
| [kitty](https://github.com/subquery/tutorials-kitty-chain)                                    | Kediciklerin doğum bilgilerini dizine dizinler.                                                                                                             | Karmaşık __call handlers__ ve __event handlers__, indekslenmiş verilerle __custom chain__                                      |
