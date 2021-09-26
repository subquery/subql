# Deploy a New Version of your SubQuery Project

## 가이드라인

SubQuery 프로젝트의 새로운 버전을 언제든지 업그레이드하여 배포할 수 있는데 SubQuery 프로젝트가 전 세계에 공개되어 있다면 이 과정 중에 고려하시기 바랍니다. 주의해야 할 중요한 점은 다음과 같습니다.
- 업그레이드가 획기적인 변경인 경우에는 새로운 프로젝트(예: `My SubQuery Project V2`)를 작성하거나 소셜 미디어 채널을 통해 커뮤니티에 변경에 대해 충분히 경고합니다.
- 새로운 SubQuery 프로젝트 버전을 배포하면 새로운 버전이 제네시스 블록의 완전한 체인을 인덱스화하므로 다운타임이 발생합니다.

## 변경 전개

Login to SubQuery Projects, and find the project that you want to deploy a new version of. 프로덕션 또는 스테이징 슬롯에 배포하도록 선택할 수 있습니다. 이 두 슬롯은 격리된 환경이며 각각 자체 데이터베이스가 있으며 독립적으로 동기화됩니다.

최종 스테이징 테스트 또는 프로젝트 데이터를 다시 동기화해야 하는 경우에만 스테이징 슬롯에 배포하는 것이 좋습니다. 그런 다음 다운타임 없이 프로덕션으로 승격할 수 있습니다. [easily debug issues](../tutorials_examples/debug-projects.md)할 수 있으므로 [running a project locall](../run/run.md)하면 테스트가 더 빨라집니다.

스테이징 슬롯은 다음에 적합합니다.
* 별도의 환경에서 SubQuery 프로젝트에 대한 변경 사항의 최종 유효성 검사. 스테이징 슬롯에는 dApp에서 사용할 수 있는 프로덕션에 대한 다른 URL이 있습니다.
* 업데이트된 SubQuery 프로젝트에 대한 데이터 워밍업 및 인덱싱을 통해 dApp의 다운타임 제거
* 공개적으로 노출하지 않고 SubQuery 프로젝트에 대한 새 릴리스를 준비합니다. 스테이징 슬롯은 Explorer에서 공개적으로 표시되지 않으며 나만 볼 수 있는 고유한 URL이 있습니다.

![스테이징 슬롯](/assets/img/staging_slot.png)

#### 최신 인덱스 및 Query 서비스로 업그레이드

최신 인덱스 ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) 또는 Query 서비스 ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) 로 업그레이드하여 정기적인 퍼포먼스와 안정성 향상을 이용하고 싶을 때는 패키지의 새로운 버전을 선택하여 저장하세요. 이로 인해 단 몇 분간의 다운타임만 발생합니다.

#### SubQuery 프로젝트 새 버전 전개

배치할 SubQuery 프로젝트 코드 기반 버전의 깃허브에서 커밋 해시를 입력합니다(완전커밋 해시를 복사합니다). 이로 인해 현재 체인의 인덱스 작성에 걸리는 시간에 따라 다운타임이 길어집니다. 진척상황은 언제든지 여기에 보고할 수 있습니다.

## 다음단계 - 프로젝트연결
배포가 성공적으로 완료되고 노드가 체인에서 데이터를 인덱스화하면 표시된 GraphQL Query 엔드 포인트를 통해 프로젝트에 접속할 수 있습니다.

![프로젝트 전개와 동기화](/assets/img/projects-deploy-sync.png)

프로젝트 제목 옆에 있는 3개의 점을 클릭하여 SubQuery 탐색기로 표시할 수도 있습니다. 브라우저 플레이 그라운드에서 를 사용하여 탐색기 - [read more about how to user our Explorer here](../query/query.md).
