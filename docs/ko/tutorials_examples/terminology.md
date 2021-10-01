# 술어

- SubQuery 프로젝트(*마법이 일어나는 곳*): SubQuery 노드가 프로젝트 네트워크를 순회하고 집계하는 방법과 데이터가 변환되는 방법에 대한 정의([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) 유용한 GraphQL 쿼리를 활성화하기 위해 저장
- SubQuery 노드(*작업이 완료된 곳*): SubQuery 프로젝트 정의를 수락하고 연결된 네트워크를 지속적으로 인덱싱하는 노드를 실행하는 패키지([`@subql/node`](https://www.npmjs.com/package/@subql/node)) 데이터베이스에
- SubQuery 쿼리 서비스(*데이터를 가져오는 위치*): 배포된 SubQuery 노드의 GraphQL API와 상호 작용하여 쿼리하고 확인하는 패키지([`@subql/query`](https://www.npmjs.com/package/@subql/query)) 인덱싱된 데이터
- GraphQL (*how we query the data*): 유연한 그래프 기반 데이터에 특히 적합한 API 쿼리 언어 - [graphql.org](https://graphql.org/learn/)를 참조