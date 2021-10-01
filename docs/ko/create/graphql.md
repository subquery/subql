# Learn more about GraphQL

## 엔티티 정의

`schema.graphql` 파일은 다양한 GraphQL 스키마를 정의합니다. GraphQL 쿼리 언어가 작동하는 방식으로 인해 스키마 파일은 본질적으로 서브쿼리의 데이터 모양을 결정합니다. There are libraries to help you implement GraphQL in [many different languages](https://graphql.org/code/)

**주요: schema 파일을 변경할 때, 다음 명령 `yarn codegen`을 사용하여 디렉토리 타입을 재생성하여서 사용하세요.**

### 엔티티
각 엔터티는 `ID!` 형식의 필수 필드 `id` 를 정의해야 합니다. 이 키는 기본 키로 사용되며 동일한 유형의 모든 엔티티에서 고유합니다.

엔티티의 Null 할 수 없는 필드는 `!` 으로 표시됩니다. 아래 예제를 참조하세요:

```graphql
예시 입력 @entity {
  id: ID! # id 필드는 항상 필수이며 다음과 같아야 합니다.
  name: String! # 필수 필드입니다.
  주소: String # 이것은 옵션 필드입니다
}
```

### 지원되는 스칼라 및 유형

현재 유동 스칼라 유형 지원:
- `아이디`
- `Int`
- `String`
- `BigInt`
- `날짜`
- `Boolean`
- `<EntityName>` 중첩된 관계 엔터티의 경우 정의된 엔터티 이름을 필드 중 하나로 사용할 수 있습니다. [엔티 관계](#entity-relationships)를 참조하세요.
- `JSON`가 구조화된 데이터를 저장할 수 있습니다, [JSON type](#json-type)을 참조하세요

## 기본 키가 아닌 필드별 인덱싱

Query 성능을 향상시키려면 기본 키가 아닌 필드에 `@index` 주석을 구현하여 엔터티 필드를 인덱싱하세요.

그러나 사용자가 [ JSON](#json-type) 개체에 `@index` 주석을 추가할 수는 없다. 기본적으로 인덱스는 데이터베이스의 JSON 필드 및 외래 키에만 자동으로 추가되지만 Query 서비스 성능만 향상시킵니다.

여기 예가 있습니다.

```graphql
사용자 @entity { 입력
  id: ID!
  이름: String! @index(unique: true) # 고유 항목을 참 또는 거짓으로 설정할 수 있습니다.
  title: Title! # 인덱스는 외부 키 필드에 자동으로 추가됩니다. 
}  
  이름: String! @index(unique:true)
}
```
이 사용자의 이름은 알고 있지만 정확한 id 값은 모른다고 가정하면 모든 사용자를 추출한 다음 이름으로 필터링하는 대신 이름 필드 뒤에 `@index` 을 추가할 수 있습니다. 이렇게 하면 Query가 훨씬 빨라지고 `unique: true`를 추가로 전달하여 고유성을 보장할 수 있다.

**필드가 고유하지 않은 경우 최대 결과 집합 크기는 100입니다.**

코드 생성을 실행하면 `User` 모델 아래에`getByName` 이 자동으로 생성되고, 외래 키 필드 `title`이 `getByTitleId` 방법을 사용함으로, 두 가지 모두 매핑 기능에서 직접 사용 할 수 있습니다.

```sql
/* 제목 엔터티에 대한 레코드 준비 */
제목 삽입 (id, name) 값 ('id_1', 'Captain')
```

```typescript
// Handler in mapping function
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## 엔티티 관계

엔터티는 종종 다른 엔터티와 중첩된 관계를 가집니다. 필드 값을 다른 엔터티 이름으로 설정하면 기본적으로 두 엔터티 간의 일대일 관계가 정의됩니다.

아래 예제를 사용하여 서로 다른 엔티티 관계(일대일, 일대다, 다대다) 를 구성할 수 있습니다.

### 일대일 관계

일대일 관계는 하나의 엔터티만 다른 엔터티에 매핑된 경우 기본값입니다.

예시: 패스포트은 한 사람의 소유이고 한 사람은 한 사람의 패스포트만 가지고 있습니다(이 예에서는):

```graphql
type Person @entity {
  id: ID!
}
  owner: Person!
}
```

또는

```graphql
type Person @entity {
  id: ID!
  passport: Passport!
}
  owner: Person!
}
```

### 일대다 관계

대괄호를 사용하여 필드 유형에 여러 개의 도면요소가 포함됨을 나타낼 수 있습니다.

Example: A person can have multiple accounts.

```graphql
type Person @entity {
  id: ID!
  accounts: [Account] 
}
  publicAddress: String!
}
```

### 다대다 관계
다대다 관계는 매핑 엔터티를 구현하여 다른 두 엔터티를 연결함으로써 달성될 수 있습니다.

예: 각 사용자는 여러 그룹(사용자 그룹) 의 일부이며 그룹에는 여러 다른 사용자(사용자 그룹) 가 있습니다.

```graphql
유형 사람 @entity {
  id: ID!
  name: String!
  groups: [PersonGroup]
}
  person: Person!
  Group: Group!
}

type Group @entity {
  name: String!
  persons: [PersonGroup]
}
```

또한 중간 도면요소의 여러 필드에 동일한 도면요소의 연결을 만들 수 있습니다.

예를 들어, 계정에는 여러 개의 전송이 있을 수 있으며 각 전송에는 소스 및 대상 계정이 있습니다.

이렇게 하면 양도 표를 통해 두 계정(출처 및 도착처) 간에 양방향 관계가 설정됩니다.

```graphql
type Account @entity {
  id: ID!
  publicAddress: String!
}

type Transfer @entity {
  id: ID!
  amount: BigInt
  from: Account!
  to: Account!
}
```

### 역방향 조회

엔터티에 대한 역방향 조회를 활성화하려면`@derivedFrom` 을 필드에 첨부하고 다른 엔터티의 역방향 조회 필드를 가리킵니다.

이렇게 하면 Query할 수 있는 가상 필드가 엔티티에 생성됩니다.

계정 "에서" 계정 엔티티에서 발신 전송 또는 발신 받기를 각각 필드에서 파생된 값으로 설정하여 액세스할 수 있습니다.

```graphql
type Account @entity {
  id: ID!
  publicAddress: String!
  sentTransfers: [Transfer] @derivedFrom(field: "from")
  receivedTransfers: [Transfer] @derivedFrom(field: "to")
}
  amount: BigInt
  from: Account!
  to: Account!
}
```

## JSON 타입

저희는 구조화된 데이터를 저장하는 빠른 방법인 JSON 유형으로 데이터 저장을 지원하고 있습니다. 이 데이터를 Query하는 데 필요한 해당 JSON 인터페이스를 자동으로 생성하여 엔터티를 정의하고 관리하는 시간을 절약해 드립니다.

다음 시나리오에서는 사용자가 JSON 유형을 사용하는 것이 좋습니다.
- 구조화된 데이터를 단일 필드에 저장하는 것이 여러 개의 개별 엔터티를 만드는 것보다 관리 용이함.
- 임의의 키/값 사용자 기본 설정 저장(여기서 값은 부울, 텍스트 또는 숫자일 수 있으며 다른 데이터 유형에 대해 별도의 열을 사용하지 않을 수 있습니다).
- Schema가 휘발성이며 자주 변경됩니다

### JSON 지시어 정의
엔터티에 `jsonField` 주석을 추가하여 속성을 JSON 유형으로 정의합니다. 이렇게 하면 프로젝트의 모든 JSON 개체에 대한 인터페이스가 `types/interfaces.ts`에 자동으로 생성되며 매핑 기능에서 액세스할 수 있습니다.

엔티티와 달리 jsonField 지시문 개체에는 `id` 필드가 필요하지 않습니다. JSON 개체는 다른 JSON 개체와 중첩할 수도 있습니다.

````graphql
type AddressDetail @jsonField {
  street: String!
  district: String!
}

type ContactCard @jsonField {
  phone: String!
  address: AddressDetail # Nested JSON
} 
  contact: [ContactCard] # Store a list of JSON objects
}
````

### Querying JSON 필드

JSON 유형을 사용할 경우 텍스트 검색을 수행할 때마다 전체 엔티티에 영향을 미치기 때문에 필터링 시 Query 효율성에 약간의 영향이 있습니다.

그러나, 그 영향은 여전히 저희의 질의 서비스에서 받아들여질 수 있습니다. 다음은 JSON 필드의 GraphQL Query에 `contains` 포함 연산자를 사용하여 '0064'가 포함된 전화번호를 소유한 처음 5명의 사용자를 찾는 방법의 예입니다.

```graphql
#처음 5명의 사용자를 찾으려면 '0064'가 포함되어 있습니다.

query{
  user(
    first: 5,
    filter: {
      contactCard: {
        contains: [{ phone: "0064" }]
    }
}){
    nodes{
      id
      contactCard
    }
  }
}
```
