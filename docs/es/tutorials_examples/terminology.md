# Terminología

- SubQuery Project (*donde sucede la magia*): Una definición ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) de cómo un SubQuery Node debe recorrer y agregar una red de proyectos y cómo los datos deben transformarse y almacenarse para permitir consultas útiles en GraphQL
- SubQuery Node (*donde se realiza el trabajo*): Un paquete ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) que aceptará la definicion del proyecto SubQuery, y ejecutar un nodo que indexa constantemente una red conectada a una base de datos
- Servicio de consulta SubQuery (*donde obtenemos los datos de*): Un paquete ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) que interactúa con la API GraphQL de un nodo de subconsulta desplegado para consultar y ver los datos indexados
- GraphQL (*cómo consultamos los datos*): Un ángulo de consulta para API que es especialmente adecuado para datos flexibles basados en gráficos - ver [graphql.org](https://graphql.org/learn/)