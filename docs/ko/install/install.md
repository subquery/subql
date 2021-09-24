# 서브쿼리 설치

서브 쿼리 프로젝트를 생성할 때는 여러 요소가 필요합니다. [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) 도구는 SubQuery 프로젝트를 만드는 데 사용됩니다. 인덱스를 실행하려면 [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) 요소가 필요합니다. 쿼리를 생성하려면 [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) 라이브러리가 필요합니다.

## @subql/cli 설치

The [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) library helps to create a project framework or scaffold meaning you don't have to start from scratch.

Yarn 또는 NPM을 사용하여 서브 쿼리 쿼리를 단말기에 글로벌하게 설치:

<CodeGroup> # Yarn yarn global add @subql/cli # NPM npm install -g @subql/cli
## @subqlnode 설치

서브 쿼리 노드는 서브 쿼리 프로젝트별로 기판 기반의 블록체인 데이터를 추출하여 포스트그레스 데이터베이스에 저장하는 방식입니다.

Yarn 또는 NPM을 사용하여 단말기에 서브 쿼리 노드를 글로벌하게 설치:

<CodeGroup> # Yarn yarn global add @subql/node # NPM npm install -g @subql/node
> 주요: 다커를 사용하고 있거나 서브 쿼리 프로젝트에서 프로젝트를 호스트하고 있으면 이 단계를 건너뛸 수 있습니다. 이는 서브 쿼리 노드가 이미 다커 컨테이너 및 호스팅 인프라스트럭처에 제공되고 있기 때문입니다.

## @subql/query 설치

서브 쿼리 라이브러리는 브라우저를 통해 "놀이터" 환경에서 프로젝트를 쿼리할 수 있는 서비스를 제공합니다.

Yarn 또는 NPM을 사용하여 서브 쿼리 쿼리를 단말기에 글로벌하게 설치:

<CodeGroup> <CodeGroupItem title="YARN" active> # Yarn yarn global add @subql/query # NPM npm install -g @subql/query </CodeGroupItem>
<CodeGroupItem title="NPM"> subql-node &lt;command&gt; </CodeGroupItem> </CodeGroup>

> 주요: 다커를 사용하고 있거나 서브 쿼리 프로젝트에서 프로젝트를 호스트하고 있으면 이 단계를 건너뛸 수도 있습니다. 이는 서브 쿼리 노드가 이미 다커 컨테이너 및 호스팅 인프라스트럭처에 제공되고 있기 때문입니다. 