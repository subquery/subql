# Tìm hiểu thêm về GraphQL

## Xác định các thực thể

` schema.graphql ` xác định các schema GraphQL khác nhau. Do cách thức hoạt động của ngôn ngữ truy vấn GraphQL, schema về cơ bản sẽ chỉ ra hình dạng dữ liệu của bạn từ SubQuery. Để tìm hiểu thêm về cách viết bằng ngôn ngữ schema GraphQL, chúng tôi khuyên bạn nên xem [ Schema và Các Thể Loại](https://graphql.org/learn/schema/#type-language).

**Quan trọng: Khi bạn thực hiện bất kỳ thay đổi nào đối với tệp lược đồ, hãy đảm bảo rằng bạn tạo lại thư mục loại của mình bằng lệnh sau `yarn codegen`**

### Thực thể
Mỗi thực thể phải xác định các trường bắt buộc của nó ` id ` với loại ` ID! `. It is used as the primary key and unique among all entities of the same type.

Non-nullable fields in the entity are indicated by `!`. Please see the example below:

```graphql
type Example @entity {
  id: ID! # id field is always required and must look like this
  name: String! # This is a required field
  address: String # This is an optional field
}
```

### Các loại và vô hướng được hỗ trợ

Chúng tôi hiện đang hỗ trợ các loại vô hướng sau:
- `ID`
- `Int`
- `String`
- `BigInt`
- `Date`
- `Boolean`
- `<EntityName>` for nested relationship entities, you might use the defined entity's name as one of the fields. Please see in [Entity Relationships](#entity-relationships).
- `JSON` có thể lưu trữ dữ liệu có cấu trúc theo cách khác, vui lòng xem [loại JSON](#json-type)

## Lập chỉ mục theo trường không phải khóa chính

Để cải thiện hiệu suất truy vấn, chỉ cần lập chỉ mục trường thực thể bằng cách thêm chú thích `@index` trên trường không phải khóa chính.

However, we don't allow users to add `@index` annotation on any [JSON](#json-type) object. By default, indexes are automatically added to foreign keys and for JSON fields in the database, but only to enhance query service performance.

Đây là một ví dụ.

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
Assuming we knew this user's name, but we don't know the exact id value, rather than extract all users and then filtering by name we can add `@index` behind the name field. This makes querying much faster and we can additionally pass the `unique: true` to  ensure uniqueness.

**Nếu một trường không phải là duy nhất, kích thước danh sách kết quả tối đa là 100**

Khi quá trình tạo mã được chạy, thao tác này sẽ tự động tạo `getByName` theo mô hình `Người dùng` và trường khóa ngoại `title` sẽ tạo phương thức `getByTitleId`, mà cả hai đều có thể được truy cập trực tiếp trong chức năng ánh xạ.

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

## Mối quan hệ thực thể

An entity often has nested relationships with other entities. Setting the field value to another entity name will define a one-to-one relationship between these two entities by default.

Các mối quan hệ thực thể khác nhau (một-một, một-nhiều và nhiều-nhiều) có thể được định cấu hình bằng cách sử dụng các ví dụ bên dưới.

### Mối quan hệ một-một

Mối quan hệ một-một là mặc định khi chỉ một thực thể duy nhất được ánh xạ tới một thực thể khác.

Ví dụ: Hộ chiếu sẽ chỉ thuộc về một người và một người chỉ có một hộ chiếu (trong ví dụ này):

```graphql
type Person @entity {
  id: ID!
}

type Passport @entity {
  id: ID!
  owner: Person!
}
```

or

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

### Mối quan hệ một-nhiều

Bạn có thể sử dụng dấu ngoặc vuông để chỉ ra rằng một loại trường bao gồm nhiều thực thể.

Ví dụ: Một người có thể có nhiều tài khoản.

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

### Mối quan hệ nhiều-nhiều
Mối quan hệ nhiều-nhiều có thể đạt được bằng cách triển khai một thực thể ánh xạ để kết nối hai thực thể khác.

Ví dụ: Mỗi người là một phần của nhiều nhóm (PersonGroup) và nhóm có nhiều người khác nhau (PersonGroup).

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

Ngoài ra, có thể tạo kết nối của cùng một thực thể trong nhiều trường của thực thể giữa.

Ví dụ: một tài khoản có thể có nhiều lần chuyển tiền và mỗi lần chuyển có một tài khoản nguồn và tài khoản đích.

Điều này sẽ thiết lập mối quan hệ hai chiều giữa hai Tài khoản (từ và đến) thông qua bảng Chuyển khoản.

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

### Tra cứu ngược

Để kích hoạt tra cứu ngược đối với một thực thể theo một mối quan hệ, hãy đính kèm `@derivedFrom` vào trường và trỏ đến trường tra cứu ngược của thực thể khác.

Điều này tạo ra một trường ảo trên thực thể có thể được truy vấn.

Chuyển "từ" một Tài khoản có thể truy cập được từ thực thể Tài khoản bằng cách đặt sentTransfer hoặc receivedTransfer có giá trị của chúng bắt nguồn từ các trường từ hoặc đến tương ứng.

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

## Loại JSON

We are supporting saving data as a JSON type, which is a fast way to store structured data. We'll automatically generate corresponding JSON interfaces for querying this data and save you time defining and managing entities.

Chúng tôi khuyên người dùng sử dụng loại JSON trong các trường hợp sau:
- Khi lưu trữ dữ liệu có cấu trúc trong một trường sẽ dễ quản lý hơn so với việc tạo nhiều thực thể riêng biệt.
- Lưu tùy chọn khóa/giá trị tùy ý của người dùng (trong đó giá trị có thể là boolean, văn bản hoặc số và bạn không muốn có các cột riêng biệt cho các kiểu dữ liệu khác nhau)
- Lược đồ dễ thay đổi và thay đổi thường xuyên

### Xác định chiều JSON
Define the property as a JSON type by adding the `jsonField` annotation in the entity. This will automatically generate interfaces for all JSON objects in your project under `types/interfaces.ts`, and you can access them in your mapping function.

Unlike the entity, the jsonField directive object does not require any `id` field. A JSON object is also able to nest with other JSON objects.

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

### Truy vấn các trường JSON

Hạn chế của việc sử dụng các loại JSON ảnh hưởng nhỏ đến hiệu quả truy vấn khi lọc, vì mỗi lần nó thực hiện tìm kiếm văn bản, nó sẽ nằm trên toàn bộ thực thể.

However, the impact is still acceptable in our query service. Here is an example of how to use the `contains` operator in the GraphQL query on a JSON field to find the first 5 users who own a phone number that contains '0064'.

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
