# GraphQL模式

## 定义Entities

`schema.graphql` 文件定义了各种GraphQL 模式。 遵循GraphQL查询语言的工作方式，模式文件基本上决定了您从 SubQuery 获取数据的格式。 为了更多地了解如何使用 GraphQL 模式语言，我们建议查看 [Schemas 和 Type](https://graphql.org/learn/schema/#type-language)。

**重要提示：当您对模式文件做任何更改时， 请确保使用命令`yarn codegen`来重新生成你的类型目录。**

### Entities
每个实体必须使用 `ID!` 类型定义必填字段 `id`。 它被用作主键，并且在所有相同类型的实体中是唯一的。

实体中非空字段由 `！`表示。 请参阅下面的示例：

```graphql
type Example @entity {
  id: ID! # id 字段总是必需的，必须像这样定义
  name: String! # 这是必填字段
  address: String # 这是一个可选字段
}
```

### 支持的标量和类型

我们目前支持以下标量类型：
- `ID`
- `Int`
- `String`
- `BigInt`
- `Float`
- `Date`
- `Boolean`
- `<EntityName>` 对于嵌套关系实体，您可以使用定义实体的名称作为字段之一。 请在 [Entity Relationships](#entity-relationships) 中查看。
- `JSON` 也可以存储结构化数据，请查看 [JSON 类型](#json-type)
- `Enum` 类型是一种特殊类型的标量，仅限特定一组允许的值。 请查看 [Graphql Enum](https://graphql.org/learn/schema/#enumeration-types)

## 按非主键字段索引

为了提高查询性能，只需在非主键字段实现 `@index` 注解，便可索引实体字段。

但是，我们不允许用户在任何 `JSON` 对象上添加 [@index](#json-type) 注解。 默认情况下，索引会自动添加到数据库的外键和JSON字段中，但这只是为了提高查询服务的性能。

参见下面的示例。

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique：true) # unique可以设置为 true 或 false
  title: Title! #索引被自动添加到外键字段
}

type Title @entity {
  id: ID!  
  name: String! @index(unique:true)
}
```
假定我们知道这个用户的名字，但我们不知道确切的 id 值。 为了不提取所有用户然后通过名称来查找，我们可以在名称字段后面添加 `@index`。 这样查询速度更快，我们还可以传入 `unique：ture` 来确保唯一性。

**如果一个字段不是唯一的，最大的查询结果数据集大小为 100**

运行代码生成时，它将自动在 `User` 模型下创建 `getByname` 。 外键字段 `title` 将创建 `getByTitleId` 方法，这两者可以通过映射函数直接访问。

```sql
/* 为标题实体准备记录 */
INSERT INTO title (id, name) VALUES('id_1', 'Captain')
```

```typescript
// 映射函数中的handler
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## Entity Relationships

一个实体往往与其他实体有嵌套的关系。 默认情况下，将字段值设置为另一个实体名称将定义这两个实体之间的一对一关系。

不同的实体关系（一对一、 一对多、 多对多）可以使用下面的例子进行配置。

### 一对一关系

当只有一个实体被映射到另一个实体时，实体关系被默认为一对一。

例如：护照只能属于一人，一个人只能持有一本护照（参考下面的例子）：

```graphql
type Person @entity { 
   id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

或者

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

### 一对多关系

您可以使用方括号来表示某个字段类型包含多个实体。

例如：一个人可以拥有多个帐户。

```graphql
type Person @entity {
  id: ID!
  type Person @entity {
  id: ID!
  accounts: [Account] 
}

type Account @entity {
  id: ID!
  publicAddress: String!
}
  publicAddress: String!
}
```

### 多对多关系
通过建立一个映射实体，将另外两个实体连接起来，可以实现多对多的关系。

示例: 每个人是多个组(PersonGroup) 的一部分，而组中有多个不同的人(PersonGroup)。

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

此外，还可以在中间实体的多个字段中创建同一实体的连接。

例如，一个帐户可以有多个转账，每个转账都有一个源帐户和目标帐户。

下面的例子通过 Transfer 表在两个 Accounts (from 和 to) 之间建立双向关系。

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

### 反向查询

要在一个实体上反向查找它的关系，请将 `@derivedFrom` 添加到字段并指向另一个实体的反向查找字段。

这将在实体上创建一个可以查询的虚拟字段。

通过将Account实体的sentTransfer或receivedTransfer字段设置为从各自的from或to字段派生的值，我们从一个Account实体中访问Transfer中“from” 的Account。

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

## JSON 类型

我们支持将数据保存为 JSON 类型，这样可以快速存储结构化数据。 我们将自动生成相应的JSON接口来查询这些数据，从而节省定义和管理实体的时间。

我们推荐用户在以下场景中使用 JSON 类型：
- 在单个字段中存储结构化数据比创建多个单独的实体更易于管理。
- 保存任意用户首选项的 键/值 数据 (其中值可以是布尔值、文本或数字，您肯定不希望为不同数据类型设置单独的列)
- 模式多样性且经常变化

### 定义 JSON 指令
通过在实体中添加 `jsonField` 注解来定义属性为 JSON 类型。 这将自动为您项目中 `types/interfaces.ts` 下的所有 JSON 对象生成接口，您可以在映射函数中访问它们。

与实体不同，jsonField 指令对象不需要 `id` 字段。 JSON对象也可以与其他JSON对象嵌套。

````graphql
type AddressDetail @jsonField {
  street: String!
  district: String!
}
  address: AddressDetail # Nested JSON
}

type User @entity {
  id: ID! 
  contact: [ContactCard] # 储存一系列JSON 对象
}
````

### 查询 JSON 字段

使用JSON类型的缺点是过滤时对查询效率有轻微影响，因为每次执行文本搜索时，都会在整个实体上进行搜索。

然而，在我们的查询服务中，这种影响仍然可以接受。 这个例子展示了如何在GraphQL查询JSON字段中使用 `contains` 操作符来找到拥有包含 '0064 ' 的电话号码的前5个用户。

```graphql
#为了找到电话号码中包含 '0064'的前5个用户。

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
