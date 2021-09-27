## Terminology

- SubQuery Project (_where the magic happens_): A definition ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) of how a SubQuery Node should traverse and aggregate a projects network and how the data should the transformed and stored to enable useful GraphQL queries
- SubQuery Node (_where the work is done_): A package ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) that will accept a SubQuery project definiton, and run a node that constantly indexes a connected network to a database
- Служба запитів SubQuery (_ звідки ми отримуємо дані _): Пакет ([`@subql/query`](https://www.npmjs.com/package/@subql/query)), який взаємодіє з API GraphQL розгорнутого вузла (ноди) SubQuery для здійснення запитів та перегляду індексованих даних
- GraphQL (_how we query the data_): A query langage for APIs that is specifically suited for flexible graph based data - see [graphql.org](https://graphql.org/learn/)
