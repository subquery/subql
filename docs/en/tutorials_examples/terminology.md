# Terminology

- SubQuery Project (*where the magic happens*): A definition ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) of how a SubQuery Node should traverse and aggregate a projects network and how the data should the transformed and stored to enable useful GraphQL queries 
- SubQuery Node (*where the work is done*): A package ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) that will accept a SubQuery project definiton, and run a node that constantly indexes a connected network to a database
- SubQuery Query Service (*where we get the data from*): A package ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) that interacts with the GraphQL API of a deployed SubQuery node to query and view the indexed data
- GraphQL (*how we query the data*): A query langage for APIs that is specifically suited for flexible graph based data - see [graphql.org](https://graphql.org/learn/)