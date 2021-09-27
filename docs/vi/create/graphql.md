# Lược đồ GraphQL

## Xác định các thực thể

Tệp `schema.graphql` xác định các lược đồ GraphQL khác nhau. Do cách thức hoạt động của ngôn ngữ truy vấn GraphQL, tệp lược đồ về cơ bản chỉ ra hình dạng dữ liệu của bạn từ SubQuery. Để tìm hiểu thêm về cách viết bằng ngôn ngữ lược đồ GraphQL, chúng tôi khuyên bạn nên xem [Lược đồ và Các Loại](https://graphql.org/learn/schema/#type-language).

**Quan trọng: Khi bạn thực hiện bất kỳ thay đổi nào đối với tệp lược đồ, hãy đảm bảo rằng bạn tạo lại thư mục loại của mình bằng lệnh sau `yarn codegen`**

### Thực thể
Mỗi thực thể phải xác định các trường bắt buộc của nó `id` với loại `ID!`. Nó được sử dụng làm khóa chính và duy nhất giữa tất cả các thực thể cùng loại.

Các trường không thể nullable trong thực thể được biểu thị bằng `!`. Vui lòng xem ví dụ dưới đây:

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
- `<EntityName>`đối với các thực thể quan hệ lồng nhau, bạn có thể sử dụng tên của thực thể đã xác định làm một trong các trường. Vui lòng xem trong [Mối quan hệ thực thể](#entity-relationships).
- `JSON` có thể lưu trữ dữ liệu có cấu trúc theo cách khác, vui lòng xem [loại JSON](#json-type)

## Lập chỉ mục theo trường không phải khóa chính

Để cải thiện hiệu suất truy vấn, chỉ cần lập chỉ mục trường thực thể bằng cách thêm chú thích `@index` trên trường không phải khóa chính.

Tuy nhiên, chúng tôi không cho phép người dùng thêm chú thích `@index` trên bất kỳ đối tượng [JSON](#json-type) nào. Theo mặc định, các chỉ mục được tự động thêm vào khóa ngoại và cho các trường JSON trong cơ sở dữ liệu, nhưng chỉ để nâng cao hiệu suất truy vấn.

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
Giả sử chúng tôi biết tên của người dùng này, nhưng chúng tôi không biết giá trị id chính xác, thay vì trích xuất tất cả người dùng và sau đó lọc theo tên, chúng tôi có thể thêm `@index` vào phía sau trường tên. Điều này làm cho việc truy vấn nhanh hơn nhiều và chúng tôi cũng có thể chuyển `unique: true` để đảm bảo tính duy nhất.

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

Một thực thể thường có các mối quan hệ lồng nhau với các thực thể khác. Đặt giá trị trường thành một tên thực thể khác sẽ xác định mối quan hệ một-một giữa hai thực thể này theo mặc định.

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

Chúng tôi đang hỗ trợ lưu dữ liệu dưới dạng JSON, đây là một cách nhanh chóng để lưu trữ dữ liệu có cấu trúc. Chúng tôi sẽ tự động tạo các giao diện JSON tương ứng để truy vấn dữ liệu này và giúp bạn tiết kiệm thời gian xác định và quản lý các thực thể.

Chúng tôi khuyên người dùng sử dụng loại JSON trong các trường hợp sau:
- Khi lưu trữ dữ liệu có cấu trúc trong một trường sẽ dễ quản lý hơn so với việc tạo nhiều thực thể riêng biệt.
- Lưu tùy chọn khóa/giá trị tùy ý của người dùng (trong đó giá trị có thể là boolean, văn bản hoặc số và bạn không muốn có các cột riêng biệt cho các kiểu dữ liệu khác nhau)
- Lược đồ dễ thay đổi và thay đổi thường xuyên

### Xác định chiều JSON
Xác định thuộc tính dưới dạng kiểu JSON bằng cách thêm chú thích `jsonField` trong thực thể. Thao tác này sẽ tự động tạo giao diện cho tất cả các đối tượng JSON trong dự án của bạn dưới `type/interface.ts` và bạn có thể truy cập chúng trong chức năng ánh xạ của mình.

Không giống như thực thể, đối tượng chỉ thị jsonField không yêu cầu bất kỳ trường `id` nào. Một đối tượng JSON cũng có thể lồng ghép với các đối tượng JSON khác.

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

Tuy nhiên, tác động vẫn có thể chấp nhận được trong dịch vụ truy vấn của chúng tôi. Dưới đây là ví dụ về cách sử dụng toán tử `chứa` trong truy vấn GraphQL trên trường JSON để tìm 5 người dùng đầu tiên sở hữu số điện thoại có chứa '0064'.

```graphql
# Để tìm 5 số điện thoại của người dùng đầu tiên có chứa '0064'.

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
