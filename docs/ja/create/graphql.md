# Learn more about GraphQL

## エンティティの定義

`schema.graphql` ファイルは、様々なGraphQLスキーマを定義します。 GraphQL クエリ言語の機能により、スキーマファイルは基本的に SubQuery からデータの型を決定します。 There are libraries to help you implement GraphQL in [many different languages](https://graphql.org/code/)

**重要: スキーマファイルに変更を加えた場合、コマンド `yarn codegen` を使用してtypesディレクトリを再生成してください**

### エンティティ
各エンティティは必要なフィールド `id` を `ID!` の型で定義する必要があります。 これは、主キーとして使用され、同じ型のすべてのエンティティの間でユニークです。

エンティティの null ではないフィールドは `!` で示されます。 以下の例をご覧ください。

```graphql
type Example @entity {
  id: ID! # id field is always required and must look like this
  name: String! # This is a required field
  address: String # This is an optional field
}
```

### サポートされているスカラー型

現在、次のスカラー型をサポートしています：
- `ID`
- `Int`
- `String`
- `BigInt`
- `Date`
- `Boolean`
- `<EntityName>` をネストされたリレーションエンティティには、定義されたエンティティの名前をフィールドの1つとして使用することができます。 [エンティティの関係](#entity-relationships) を参照してください。
- `JSON` は構造化されたデータを格納することができます。 [JSON type](#json-type) を参照してください。

## 非プライマリキーフィールドによるインデックス

クエリのパフォーマンスを向上させるために、主キーでないフィールドに `@index` アノテーションを実装するだけで、エンティティフィールドにインデックスを付けます。

ただし、 `JSON` オブジェクトに [@index](#json-type) アノテーションを追加することはできません。 デフォルトでは、インデックスは外部キーとデータベース内の JSON フィールドに自動的に追加されますが、クエリーサービスのパフォーマンスを向上させるためにのみ追加されます。

次に例を示します。

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique: true) # unique can be set to true or false
  title: Title! # Indexes are automatically added to foreign key field 
}

type Title @entity {
  id: ID!  
  name: String! @index(unique:true)
}
```
このユーザーの名前を知っていたとしても、正確な id がわかりません。 すべてのユーザーを抽出し、名前でフィルタリングするのではなく、 `@index` を名前フィールドの後ろに追加することができます。 これによりクエリの処理がより速くなり、さらに`unique: true`を渡す事で一意性を確保します。

**フィールドが一意でない場合、最大結果セットサイズは100です**

When code generation is run, this will automatically create a `getByName` under the `User` model, and the foreign key field `title` will create a `getByTitleId` method, which both can directly be accessed in the mapping function.

```sql
/* Prepare a record for title entity */
INSERT INTO titles (id, name) VALUES ('id_1', 'Captain')
```

```typescript
// Handler in mapping function
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## エンティティリレーションシップ

エンティティは、多くの場合、他のエンティティとネストされたリレーションシップを持ちます。 フィールド値を別のエンティティ名に設定すると、デフォルトでこれら2つのエンティティ間の1対1のリレーションシップが定義されます。

異なるエンティティリレーションシップ(1対1、1対多、および多対多)は、以下の例を使用して構成できます。

### 1対1のリレーションシップ

1対1のリレーションは、単一のエンティティのみが別のエンティティにマップされる場合のデフォルトです。

例: パスポートは1人のみに属し、1つのパスポートしか持っていません(この例では、パスポートは1つだけです):

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

または

```graphql
type Person @entity {
  id: ID!
  passport: Passport!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

### 1対多のリレーションシップ

フィールドタイプに複数のエンティティが含まれていることを示すために、角括弧を使用することができます。

例: 人は複数のアカウントを持つことができます。

```graphql
type Person @entity {
  id: ID!
  accounts: [Account] 
}

type Account @entity {
  id: ID!
  publicAddress: String!
}
```

### 多対多のリレーションシップ
他の2つのエンティティを接続するマッピングエンティティを実装することで、多対多のリレーションを実現することができます。

例: 各人は複数のグループ (PersonGroup) の一部であり、グループは複数の異なる人 (PersonGroup) がいます。

```graphql
type Person @entity {
  id: ID!
  name: String!
  groups: [PersonGroup]
}

type PersonGroup @entity {
  id: ID!
  person: Person!
  Group: Group!
}

type Group @entity {
  id: ID!
  name: String!
  persons: [PersonGroup]
}
```

また、中間エンティティの複数のフィールドに同じエンティティの接続を作成することもできます。

たとえば、1つの口座には複数の転送が可能で、それぞれの転送には転送元と宛先の口座があります。

これにより、転送テーブルを介して2つのアカウント間の双方向の関係が確立されます。

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

### 逆引き参照

リレーションに対するエンティティの逆ルックアップを有効にするには、 `@derivedFrom` をフィールドに添付し、別のエンティティの逆参照フィールドを指します。

クエリ可能なエンティティ上に仮想フィールドが作成されます。

アカウントからの転送は、sentTransferまたはreceivedTransferを、それぞれのフィールドから取得した値として設定することで、アカウントエンティティからアクセスできます。

```graphql
type Account @entity {
  id: ID!
  publicAddress: String!
  sentTransfers: [Transfer] @derivedFrom(field: "from")
  receivedTransfers: [Transfer] @derivedFrom(field: "to")
}

type Transfer @entity {
  id: ID!
  amount: BigInt
  from: Account!
  to: Account!
}
```

## JSON タイプ

構造化されたデータを格納するための迅速な方法であるJSON型としてデータの保存をサポートしています。 このデータを照会するために対応する JSON インターフェイスを自動的に生成し、エンティティの定義と管理にかかる時間を節約します。

次のシナリオでは、ユーザーが JSON 型を使用することを推奨します。
- 構造化されたデータを1つのフィールドに格納する場合、複数の個別のエンティティを作成するよりも管理が可能です。
- 任意のキー/値のユーザー設定の保存（値がbool値、テキスト、数値のいずれかであり、異なるデータタイプのために別々の列を持ちたくない場合）。
- スキーマは不安定で頻繁に変更されます

### JSON ディレクティブを定義
`jsonField` アノテーションをエンティティに追加することで、プロパティを JSON 型として定義します。 これにより、プロジェクト内のすべてのJSONオブジェクトのインターフェイスが`types/interfaces.ts`に自動的に生成され、マッピング関数でそれらにアクセスできるようになります。

エンティティとは異なり、jsonFieldディレクティブオブジェクトは`id`フィールドを必須としません。 JSON オブジェクトは他の JSON オブジェクトとともにネストすることもできます。

````graphql
type AddressDetail @jsonField {
  street: String!
  district: String!
}

type ContactCard @jsonField {
  phone: String!
  address: AddressDetail # Nested JSON
}

type User @entity {
  id: ID! 
  contact: [ContactCard] # Store a list of JSON objects
}
````

### JSON フィールドのクエリ

JSON型を使用することの欠点は、テキスト検索を行うたびにエンティティ全体を対象としているため、フィルタリング時のクエリ効率に若干の影響があることです。

しかし、その影響はクエリサービスではまだ許容範囲内です。 ここでは、JSONフィールドのGraphQLクエリで`contains`演算子を使用して、”0064”を含む電話番号を所有する最初の5人のユーザーを検索する例を紹介します。

```graphql
#To find the the first 5 users own phone numbers contains '0064'.

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
