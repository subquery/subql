# Manifest File

Tệp Manifest `project.yaml` có thể được xem như một điểm đầu vào của dự án của bạn và nó xác định hầu hết các chi tiết về cách SubQuery sẽ lập chỉ mục và chuyển đổi dữ liệu chuỗi.

Tệp kê khai có thể ở định dạng YAML hoặc JSON. Trong tài liệu này, chúng tôi sẽ sử dụng YAML trong tất cả các ví dụ. Dưới đây là ví dụ tiêu chuẩn về `project.yaml` cơ bản.

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

Thông thường người dùng sẽ tạo một SubQuery và mong muốn sử dụng lại nó cho cả môi trường testnet và mainnet của họ (ví dụ: Polkadot và Kusama). Giữa các mạng, các tùy chọn khác nhau có thể khác nhau (ví dụ: khối bắt đầu lập chỉ mục). Do đó, chúng tôi cho phép người dùng xác định các chi tiết khác nhau cho từng nguồn dữ liệu, có nghĩa là một dự án SubQuery vẫn có thể được sử dụng trên nhiều mạng.

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

Chỉ dữ liệu đến thỏa mãn các điều kiện lọc sẽ được xử lý bởi các hàm ánh xạ. Bộ lọc ánh xạ là tùy chọn nhưng được khuyến nghị vì chúng làm giảm đáng kể lượng dữ liệu được xử lý bởi dự án SubQuery của bạn và sẽ cải thiện hiệu suất lập chỉ mục.

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
- Bộ lọc `specVersion` chỉ định phạm vi phiên bản cụ thể cho khối chất nền. Các ví dụ sau đây mô tả cách đặt phạm vi phiên bản.

```yaml
filter:
  specVersion: [23, 24]   #Index block with specVersion in between 23 and 24 (inclusive).
  specVersion: [100]      #Index block with specVersion greater than or equal 100.
  specVersion: [null, 23] #Index block with specVersion less than or equal 23.
```

## Chuỗi tùy chỉnh

Bạn có thể lập chỉ mục dữ liệu từ các chuỗi tùy chỉnh bằng cách bao gồm các loại chuỗi trong `project.yaml`. Khai báo các loại cụ thể được blockchain này hỗ trợ trong `network.types`. Chúng tôi hỗ trợ các loại bổ sung được sử dụng bởi các mô-đun thời gian chạy chất nền.

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
