# Chạy SubQuery trên môi trường local

Hướng dẫn này hoạt động thông qua cách chạy một node SubQuery cục bộ trên cơ sở hạ tầng của bạn, bao gồm cả trình lập chỉ mục và dịch vụ truy vấn. Bạn không muốn lo lắng về việc chạy cơ sở hạ tầng SubQuery của riêng mình? SubQuery cung cấp miễn phí [ dịch vụ được lưu trữ được quản lý ](https://explorer.subquery.network) cho cộng đồng. [ Thực hiện theo hướng dẫn xuất bản của chúng tôi ](../publish/publish.md) để xem cách bạn có thể tải dự án của mình lên [ Dự án SubQuery ](https://project.subquery.network).

## Sử dụng Docker

Một giải pháp thay thế là chạy <strong> Docker Container </strong>, được xác định bởi tệp ` docker-compos.yml `. Đối với một dự án mới vừa được khởi tạo, bạn sẽ không cần phải thay đổi bất cứ điều gì ở đây.

Trong thư mục dự án, hãy chạy lệnh sau:

```shell
docker-compose pull && docker-compose up
```

Trong lần đầu tiên có thể bạn sẽ mất chút thời gian để tải xuống các package cần thiết ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) và Postgres), nhưng sau đó node SubQuery sẽ nhanh chóng được khởi chạy.

## Khởi chạy bộ lập chỉ mục (Indexer) (subql/node)

Cần có:

- [Postgres](https://www.postgresql.org/) database (version 12 hoặc cao hơn). Trong khi [SubQuery node](#start-a-local-subquery-node) đang lập chỉ mục chuỗi khối, dữ liệu trích xuất được lưu trữ trong một phiên bản cơ sở dữ liệu bên ngoài.

Một node SubQuery sẽ triển khai trích xuất dữ liệu blockchain dựa trên chất nền (substrate) cho mỗi dự án SubQuery và lưu nó vào cơ sở dữ liệu Postgres.

### Cài đặt

```shell
# NPM
npm install -g @subql/node
```

Xin lưu ý rằng chúng tôi **KHÔNG** khuyến khích sử dụng `yarn global` vì khâu quản lý phụ thuộc của nó rất kém, có thể dẫn đến sai sót trong dây chuyền.

Sau khi cài đặt, bạn có thể khởi chạy một node bằng lệnh sau:

```shell
subql-node <command>
```

### Các lệnh chính

Các lệnh sau sẽ hỗ trợ bạn hoàn thành cấu hình của một node SubQuery và bắt đầu lập chỉ mục. Để tìm hiểu thêm, bạn luôn có thể chạy `--help`.

#### Trỏ đến đường dẫn dự án trên môi trường local

```
subql-node -f your-project-path
```

#### Sử dụng Từ điển

Sử dụng từ điển chuỗi đầy đủ có thể tăng tốc đáng kể quá trình xử lý dự án SubQuery trong quá trình thử nghiệm hoặc trong lần lập chỉ mục đầu tiên của bạn. Trong một số trường hợp, chúng tôi đã thấy hiệu suất lập chỉ mục tăng lên đến 10 lần.

Bộ từ điển này sẽ lập sẵn đầy đủ chỉ mục về vị trí của tất cả các sự kiện và yếu tố ngoại vi (extrinsics) trong blockchain liên quan và cho phép dịch vụ node của bạn chuyển đến các vị trí hợp lý khi lập chỉ mục thay vì phải kiểm tra từng block.

Bạn có thể trực tiếp thêm điểm cuối (endpoint) của từ điển vào tệp `project.yaml` (xem [Tệp kê khai (Manifest)](../create/manifest.md)) hoặc chỉ định điểm cuối tại thời điểm chạy bằng lệnh sau:

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

[Đọc thêm về cách hoạt động của Từ điển SubQuery](../tutorials_examples/dictionary.md).

#### Kết nối với cơ sở dữ liệu

```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
subql-node -f your-project-path 
````

Tùy thuộc vào cấu hình cơ sở dữ liệu Postgres của bạn (ví dụ: mật khẩu cơ sở dữ liệu khác), hãy đảm bảo rằng cả trình chỉ mục (`subql/node`) và dịch vụ truy vấn (` subql/query`) đều có thể thiết lập kết nối với nó.

#### Chỉ định tệp cấu hình

```
subql-node -c your-project-config.yml
```

Thao tác này sẽ trỏ nút truy vấn đến tệp cấu hình có thể ở định dạng YAML hoặc JSON. Kiểm tra ví dụ dưới đây.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Thay đổi kích thước lô tìm nạp block

```
subql-node -f your-project-path --batch-size 200

Kết quả:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

Khi chain được lập chỉ mục lần đầu tiên, việc tìm nạp (fetching) các block đơn lẻ sẽ làm giảm đáng kể hiệu suất. Phương thức tăng batch size để điều chỉnh số lượng block được tìm nạp sẽ giúp làm giảm thời gian xử lý tổng thể. Batch size mặc định hiện đang là 100.

#### Chế độ local

```
subql-node -f your-project-path --local
```

Người dùng có thể để node chạy ở chế độ local nhằm phục vụ việc gỡ bug. Viêc chuyển sang chế độ local sẽ tạo các bảng Postgres trong sơ đồ `công khai` mặc định.

Xin lưu ý rằng chúng tôi **KHÔNG** khuyến khích sử dụng `yarn global` vì khâu quản lý phụ thuộc của nó rất kém, có thể dẫn đến sai sót trong dây chuyền.


#### Kiểm tra tình trạng nút của bạn

Có 2 điểm cuối mà bạn có thể sử dụng để kiểm tra và theo dõi tình trạng của một nút SubQuery đang chạy.

- Điểm cuối kiểm tra sức khỏe trả về một phản hồi 200 đơn giản
- Điểm cuối siêu dữ liệu bao gồm các phân tích bổ sung về nút SubQuery đang chạy của bạn

Nối phần này vào URL cơ sở của nút SubQuery của bạn. Ví dụ: ` http: // localhost: 3000 / meta ` sẽ trả về:

```bash
{
    "currentProcessingHeight": 1000699,
    "currentProcessingTimestamp": 1631517883547,
    "targetHeight": 6807295,
    "bestHeight": 6807298,
    "indexerNodeVersion": "0.19.1",
    "lastProcessedHeight": 1000699,
    "lastProcessedTimestamp": 1631517883555,
    "uptime": 41.151789063,
    "polkadotSdkVersion": "5.4.1",
    "apiConnected": true,
    "injectedApiConnected": true,
    "usingDictionary": false,
    "chain": "Polkadot",
    "specName": "polkadot",
    "genesisHash": "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
    "blockTime": 6000
}
```

` http: // localhost: 3000 / health ` sẽ trả về HTTP 200 nếu thành công.

Lỗi 500 sẽ được trả về nếu trình lập chỉ mục không khỏe mạnh. Điều này thường có thể được nhìn thấy khi nút đang khởi động.

```shell
{
    "status": 500,
    "error": "Indexer is not healthy"
}
```

Nếu một URL không chính xác được sử dụng, lỗi 404 not found sẽ được trả về.

```shell
{
"statusCode": 404,
"message": "Cannot GET /healthy",
"error": "Not Found"
}
```

#### Gỡ lỗi dự án của bạn

Sử dụng [ trình kiểm tra nút ](https://nodejs.org/en/docs/guides/debugging-getting-started/) để chạy lệnh sau.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Ví dụ:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```
Sau đó, mở các công cụ dành cho nhà phát triển Chrome, đi tới Nguồn > Hệ thống tệp và thêm dự án của bạn vào không gian làm việc và bắt đầu gỡ lỗi. Để biết thêm thông tin, hãy kiểm tra [ Cách gỡ lỗi dự án SubQuery ](https://doc.subquery.network/tutorials_examples/debug-projects/)
## Khởi chạy Dịch vụ Truy vấn (subql/query)

### Cài đặt

```shell
# NPM
npm install -g @subql/query
```

Xin lưu ý rằng chúng tôi **KHÔNG** khuyến khích sử dụng `yarn global` vì khâu quản lý phụ thuộc của nó rất kém, có thể dẫn đến sai sót trong dây chuyền.

### Menjalankan layanan Kueri
``` export DB_HOST=localhost subql-query --name <project_name> --playground ````

Đảm bảo rằng tên dự án này trùng với tên bạn đã đặt từ lúc [khởi tạo dự án](../quickstart/quickstart.md#initialise-the-starter-subquery-project). Ngoài ra, hãy kiểm tra xem các biến môi trường đã chuẩn hay chưa.

Sau khi chạy thành công dịch vụ truy vấn subql, hãy mở trình duyệt và truy cập địa chỉ `http://localhost:3000`. Bạn sẽ thấy một GraphQL Playground hiển thị trong trình duyệt với sơ đồ đã sẵn sàng để truy vấn.
