# Terminoloji

- SubQuery Project (* where the magic happens*): Bir SubQuery Düğümünün bir proje ağından nasıl geçmesi ve toplaması gerektiği ve verilerin yararlı GraphQL sorgularını etkinleştirmek için nasıl dönüştürülmesi ve depolandığı hakkında bir tanım ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli))
- SubQuery Node (* where the work is doner*): Bir SubQuery projesi definiton'ını kabul edecek ve bağlı bir ağı veritabanına sürekli olarak dizine alan bir düğümü çalıştıracak bir paket ([`@subql/node`](https://www.npmjs.com/package/@subql/node))
- SubQuery Query Service (*where we get the data from*): Dizine alınan verileri sorgulamak ve görüntülemek için dağıtılan bir SubQuery node GraphQL API'si ile etkileşime giren bir paket ([`@subql/query`](https://www.npmjs.com/package/@subql/query))
- GraphQL (*how we query the data*): Esnek grafik tabanlı veriler için özel olarak uygun API'ler için bir query langage - bkz[graphql.org](https://graphql.org/learn/)