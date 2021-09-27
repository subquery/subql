## Terminology

- SubQuery Project (_where the magic happens_): A definition ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) of how a SubQuery Node should traverse and aggregate a projects network and how the data should the transformed and stored to enable useful GraphQL queries
- SubQuery Node (_where the work is done_): A package ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) that will accept a SubQuery project definiton, and run a node that constantly indexes a connected network to a database
- SubQuery Query Service (_where we get the data from_): A package ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) that interacts with the GraphQL API of a deployed SubQuery node to query and view the indexed data
- GraphQL (_how we query the data_): A query langage for APIs that is specifically suited for flexible graph based data - see [graphql.org](https://graphql.org/learn/)
