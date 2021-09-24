# Manifest File

Tệp Manifest `project.yaml` có thể được xem như một điểm đầu vào của dự án của bạn và nó xác định hầu hết các chi tiết về cách SubQuery sẽ lập chỉ mục và chuyển đổi dữ liệu chuỗi.

The Manifest can be in either YAML or JSON format. In this document, we will use YAML in all the examples. Below is a standard example of a basic `project.yaml`.

``` yml
specVersion: "0.0.1"
description: ""
repository: "https://github.com/subquery/subql-starter"

schema: "./schema.graphql"

network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"
  # Optionally provide the HTTP endpoint of a full chain dictionary to speed up processing
  dictionary: "https://api.subquery.network/sq/subquery/dictionary-polkadot"

dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
        - handler: handleEvent
          kind: substrate/EventHandler
          filter: #Filter is optional but suggested to speed up event processing
            module: balances
            method: Deposit
        - handler: handleCall
          kind: substrate/CallHandler
```

- `network.endpoint` xác định điểm cuối wss hoặc ws của chuỗi khối sẽ được lập chỉ mục - **Đây phải là một node lưu trữ đầy đủ**.
- `network.dictionary` tùy chọn cung cấp điểm cuối HTTP của từ điển chuỗi đầy đủ để tăng tốc độ xử lý - xem [Chạy Trình lập chỉ mục](../run/run.md#using-a-dictionary)
- `dataSources` xác định dữ liệu sẽ được lọc và trích xuất và vị trí của trình xử lý hàm ánh xạ để áp dụng chuyển đổi dữ liệu.
  - `kind` hiện chỉ hỗ trợ `substrate/Runtime`.
  - `startBlock` chỉ định chiều cao khối để bắt đầu lập chỉ mục.
  - `filter` sẽ lọc nguồn dữ liệu để thực thi theo tên thông số điểm cuối của mạng, hãy xem [bộ lọc mạng](#network-filters)
  - `mapping.handlers` sẽ liệt kê tất cả [các hàm ánh xạ](./mapping.md) và các loại trình xử lý tương ứng của chúng, với các bộ lọc ánh xạ [ bổ sung](#mapping-filters).

## Bộ lọc mạng

Usually the user will create a SubQuery and expect to reuse it for both their testnet and mainnet environments (e.g Polkadot and Kusama). Between networks, various options are likely to be different (e.g. index start block). Therefore, we allow users to define different details for each data source which means that one SubQuery project can still be used across multiple networks.

Người dùng có thể thêm `filter` trên `dataSources` để quyết định nguồn dữ liệu nào sẽ chạy trên mỗi mạng.

Dưới đây là một ví dụ hiển thị các nguồn dữ liệu khác nhau cho cả mạng Polkadot và Kusama.

```yaml
...
network:
  endpoint: "wss://polkadot.api.onfinality.io/public-ws"

#Create a template to avoid redundancy
definitions:
  mapping: &mymapping
    handlers:
      - handler: handleBlock
        kind: substrate/BlockHandler

dataSources:
  - name: polkadotRuntime
    kind: substrate/Runtime
    filter:  #Optional
        specName: polkadot
    startBlock: 1000
    mapping: *mymapping #use template here
  - name: kusamaRuntime
    kind: substrate/Runtime
    filter: 
        specName: kusama
    startBlock: 12000 
    mapping: *mymapping # can reuse or change
```

## Bộ lọc ánh xạ

Bộ lọc ánh xạ là một tính năng cực kỳ hữu ích để quyết định khối, sự kiện hoặc bên ngoài nào sẽ kích hoạt trình xử lý ánh xạ.

Only incoming data that satisfy the filter conditions will be processed by the mapping functions. Mapping filters are optional but are recommended as they significantly reduce the amount of data processed by your SubQuery project and will improve indexing performance.

```yaml
#Example filter from callHandler
filter: 
   module: balances
   method: Deposit
   success: true
```

Bảng sau giải thích các bộ lọc được hỗ trợ bởi các trình xử lý khác nhau.

| Handler                                    | Bộ lọc được hỗ trợ           |
| ------------------------------------------ | ---------------------------- |
| [BlockHandler](./mapping.md#block-handler) | `specVersion`                |
| [EventHandler](./mapping.md#event-handler) | `module`,`method`            |
| [CallHandler](./mapping.md#call-handler)   | `module`,`method` ,`success` |


-  Bộ lọc mô-đun và phương pháp được hỗ trợ trên bất kỳ chuỗi dựa trên chất nền nào.
- Bộ lọc `success` nhận một giá trị boolean và có thể được sử dụng để lọc phần bên ngoài theo trạng thái thành công của nó.
- The `specVersion` filter specifies the spec version range for a substrate block. The following examples describe how to set version ranges.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```

## Chuỗi tùy chỉnh

You can index data from custom chains by also including chain types in the `project.yaml`. Declare the specific types supported by this blockchain in `network.types`. We support the additional types used by substrate runtime modules.

`stylesAlias`, `stylesBundle`, `stylesChain` và `stylesSpec` cũng được hỗ trợ.

``` yml
specVersion: "0.0.1"
description: "This subquery indexes kitty's birth info"
repository: "https://github.com/onfinality-io/subql-examples"
schema: "./schema.graphql"
network:
  endpoint: "ws://host.kittychain.io/public-ws"
  types: {
    "KittyIndex": "u32",
    "Kitty": "[u8; 16]"
  }
# typesChain: { chain: { Type5: 'example' } }
# typesSpec: { spec: { Type6: 'example' } }
dataSources:
  - name: runtime
    kind: substrate/Runtime
    startBlock: 1
    filter:  #Optional
      specName: kitty-chain 
    mapping:
      handlers:
        - handler: handleKittyBred
          kind: substrate/CallHandler
          filter:
            module: kitties
            method: breed
            success: true
```
