# Learn more about GraphQL

## 定义实体

`schema.graphql` 文件定义了各种GraphQL schemas。 由于GraphQL查询语言的工作方式，方案文件基本上决定了您从 SubQuery 获取数据的形状。 There are libraries to help you implement GraphQL in [many different languages](https://graphql.org/code/)

**重要：当您对模式文件做任何更改时， 请确保你重新生成你的类型目录，命令 `yarn codegen`**

### 实体
每个实体必须使用 `ID!` 类型定义其必填字段 `id`。 它被用作同类所有实体的主要钥匙和独特之处。

实体中不可用字段由 `表示！ 请参阅下面的示例：</p>

<pre><code class="graphql">type Example @entity {
  id: ID! 输入示例 @entity 然后
  id: ID! # id 字段总是必需的，必须看起来像此
  名称：字符串！ # 这是必填字段
  地址：字符串 # 这是一个可选字段
}
`</pre>

### 支持的标尺和类型

我们目前支持流量缩放类型：
- `ID`
- `英寸`
- `字符串`
- `BigInt`
- `日期`
- `Boolean`
- `<EntityName>` 对于嵌套关系实体，您可以使用定义实体的名称作为字段之一。 请在 [实体关系](#entity-relationships) 中查看。
- `JSON` 也可以存储结构化数据，请查看 [JSON 类型](#json-type)

## 非主键领域索引

为了提高查询性能，只需在非主键字段实现 `@index` 注解，便可索引实体字段。

但是，我们不允许用户在任何 `JSON` 对象上添加 [@index](#json-type) 注释。 默认情况下，索引会自动添加到外键和 JSON 字段，但只是为了提高查询服务的性能。

这里就是一个例子。

```graphql
type User @entity {
  id: ID!
  name: String! @index(unique: true) # unique can be set to true or false
  title: Title! @index(唯一：true) # 唯一可以设置为 true 或 false
  title: Title! # 索引被自动添加到外国密钥字段 
}

类型标题 @entity 。 id: ID！  
  名称: 字符串 ！ @index(唯一:true)
}
```
假定我们知道这个用户的名字，但我们不知道确切的 id 值。 而不是提取所有用户，然后通过名称过滤，我们可以在名称字段后面添加 `@index` 这使查询速度更快，我们还可以通过 `的唯一性：真的` 来确保唯一性。

**如果字段不是唯一的，最大结果设置为 100**

当代码生成运行时，它将自动在 `用户` 模型下创建 `getByname` 。 和外键字段 `标题` 将创建 `getByTitleId` 方法 这两者都可以直接访问映射功能。

```sql
/* 为标题实体准备记录 */
INSERT INTO title (id, name) VALUES('id_1', 'Captain')
```

```typescript
// 映射函数中的处理程序
import {User} from "../types/models/User"
import {Title} from "../types/models/Title"

const jack = await User.getByName('Jack Sparrow');

const captainTitle = await Title.getByName('Captain');

const pirateLords = await User.getByTitleId(captainTitle.id); // List of all Captains
```

## 实体关系

一个实体往往与其他实体有嵌套的关系。 设置字段值为另一个实体名将默认定义这两个实体之间的一对一关系。

可以使用以下示例配置不同的实体关系(一对一、一对多和多对多)

### 一对一关系

只有一个实体被映射到另一个实体时，一对一的关系是缺省的。

例如：护照只属于一人，只有一本护照(例如)：

```graphql
type Person @entity {
  id: ID!
type Person @entity {
  id: ID!
  passport: Passport!
}

type Passport @entity {
  id: ID!
  所有者：个人！
  owner: Person!
}
```

或

```graphql
type Person @entity {
  id: ID!
  passport: Passport!
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
  owner: Person!
}
```

### 一对多关系

您可以使用方括号来表示字段类型包含多个实体。

示例：一个人可以有多个帐户。

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

示例：每个人都是多个组的一部分(个人组)，还有多个不同的人(个人组)。

```graphql
type Person @entity {
  id: ID!
  name: String!
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
  人员: [PersonGroup]
}
  person: Person!
  Group: Group!
}

type Group @entity {
  id: ID!
  name: String!
  persons: [PersonGroup]
}
```

此外，还可以在中间实体的多个领域创建同一实体的连接。

例如，一个帐户可能有多次转账，每次转账都有一个来源和目的地帐户。

这将通过 Transfer 表在两个 Accounts (from 和 to) 之间建立双向关系。

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

为了启用在一个实体上反向查找关系， 将 `@derivedFrom` 附加到字段，并指向另一个实体的反向查找字段。

这将在可以查询的实体上创建一个虚拟字段。

“从”账户转账可从账户实体通过设定发送或接收的转账具有从相应字段或字段衍生出的价值。

```graphql
type Account @entity {
  id: ID!
  publicAddress: String!
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
  amount: BigInt
  from: Account!
  to: Account!
}
```

## JSON 类型

我们支持将数据保存为 JSON 类型，这是存储结构化数据的一个快速方法。 我们会自动生成相应的 JSON 接口来查询此数据，并节省您的时间来定义和管理实体。

我们推荐用户在以下场景中使用 JSON 类型：
- 在一个单一领域储存结构化数据比创建多个单独实体更易管理。
- 保存任意键/值用户首选项 (其中值可以是布尔值、文本或数字，并且您不希望不同数据类型有单独的列)
- 模式不稳定且经常变化

### 定义 JSON 指令
通过在实体中添加 `jsonField` 注解来定义属性为 JSON 类型。 这将自动为您项目中 `types/interfaces.ts` 下的所有 JSON 对象生成接口，您可以在映射函数中访问它们。

与实体不同，jsonField 指令对象不需要 `id` 字段。 JSON对象也可以与其他JSON对象嵌套。

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

### 查询 JSON 字段

使用 JSON 类型的缺点对过滤时查询效率有轻微的影响， 每次进行文本搜索时，它都在整个实体上。

然而，我们的查询服务仍然可以接受这种影响。 这里是如何使用 `的示例在 JSON 字段的 GraphQL 查询中包含` 操作员来找到拥有包含 '0064 ' 的电话号码的前5个用户。

```graphql
#要找到前5个用户自己的电话号码包含 '0064'。

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
