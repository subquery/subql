# Chạy SubQuery trên môi trường local

Hướng dẫn này sẽ chỉ dẫn cách khởi chạy một node SubQuery một cách cục bộ trên cơ sở hạ tầng của bạn, bao gồm cả trình lập index và dịch vụ truy vấn. Bạn không muốn phải lo lắng khi khởi chạy SubQuery trên môi trường của riêng mình? SubQuery cung cấp [ dịch vụ lưu trữ có quản lý](https://explorer.subquery.network) miễn phí cho cộng đồng. [Hãy làm theo hướng dẫn của chúng tôi ](../publish/publish.md)để biết cách upload dự án của bạn lên [SubQuery](https://project.subquery.network).

## Sử dụng Docker

Một giải pháp thay thế là chạy trên môi trường <strong>Docker Container</strong> được quy định bởi tệp `docker-comp.yml`. Đối với một dự án mới vừa được khởi tạo, bạn sẽ không cần phải thay đổi bất cứ điều gì trong đó.

Trong thư mục dự án, hãy chạy lệnh sau:

```shell
docker-compose pull && docker-compose up
```

Trong lần đầu tiên có thể bạn sẽ mất chút thời gian để tải xuống các package cần thiết ([`@subql/node`](https://www.npmjs.com/package/@subql/node), [`@subql/query`](https://www.npmjs.com/package/@subql/query) và Postgres), nhưng sau đó node SubQuery sẽ nhanh chóng được khởi chạy.

## Khởi chạy bộ lập chỉ mục (Indexer) (subql/node)

Cần có:

- Cơ sở dữ liệu [Postgres](https://www.postgresql.org/) (phiên bản 12 trở lên). Trong lúc [node SubQuery ](#start-a-local-subquery-node) đang lập index cho blockchain, dữ liệu trích xuất sẽ được lưu trữ trong một phiên bản cơ sở dữ liệu (database instance) bên ngoài.

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

Các lệnh sau sẽ hỗ trợ bạn hoàn thành việc cài đặt cấu hình cho node SubQuery và bắt đầu lập chỉ mục. Để tìm hiểu thêm, bạn có thể gõ lệnh `--help`.

#### Trỏ đến đường dẫn dự án trên môi trường local

```
subql-node -f your-project-path
```

#### Sử dụng Từ điển

Việc sử dụng từ điển đầy đủ cho blockchain có thể tăng tốc đáng kể thời gian xử lý dự án SubQuery trong quá trình thử nghiệm hoặc trong lần lập chỉ mục đầu tiên của bạn. Trong một số trường hợp, hiệu suất lập chỉ mục có thể tăng gấp 10 lần.

Bộ từ điển này sẽ lập sẵn đầy đủ chỉ mục về vị trí của tất cả các sự kiện và yếu tố ngoại vi (extrinsics) trong blockchain liên quan và cho phép dịch vụ node của bạn chuyển đến các vị trí hợp lý khi lập chỉ mục thay vì phải kiểm tra từng block.

Bạn có thể trực tiếp thêm điểm cuối (endpoint) của từ điển vào tệp `project.yaml` (xem [Tệp kê khai (Manifest)](../create/manifest.md)) hoặc chỉ định điểm cuối tại thời điểm chạy bằng lệnh sau:

```
subql-node --network-dictionary=https://api.subquery.network/sq/subquery/dictionary-polkadot
```

#### Kết nối với cơ sở dữ liệu

```
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
subql-node -f your-project-path 
````

Tùy thuộc vào cấu hình cơ sở dữ liệu Postgres của bạn (ví dụ: có một mật khẩu cơ sở dữ liệu khác), hãy đảm bảo rằng cả trình lập chỉ mục (`subql/node`) và dịch vụ truy vấn (`subql/query`) đều có thể kết nối với CSDL ấy.

#### Chỉ định tệp cấu hình

```
subql-node -c your-project-config.yml
```

Thao tác này sẽ trỏ node truy vấn đến tệp cấu hình có định dạng YAML hoặc JSON. Lihat contoh di bawah ini.

```yaml
subquery: ../../../../subql-example/extrinsics
subqueryName: extrinsics
batchSize:100
localMode:true
```

#### Thay đổi kích thước lô tìm nạp block

```
subql-node -f your-project-path --batch-size 200

Result:
[IndexerManager] fetch block [203, 402]
[IndexerManager] fetch block [403, 602]
```

Khi chain được lập chỉ mục lần đầu tiên, việc tìm nạp (fetching) các block đơn lẻ sẽ làm giảm đáng kể hiệu suất. Phương thức tăng batch size để điều chỉnh số lượng block được tìm nạp sẽ giúp làm giảm thời gian xử lý tổng thể. Batch size mặc định hiện đang là 100.

#### Chế độ local

```
subql-node -f your-project-path --local
```

Người dùng có thể để node chạy ở chế độ local nhằm phục vụ việc gỡ bug. Viêc chuyển sang chế độ local sẽ tạo các bảng Postgres trong sơ đồ `công khai` mặc định.

Nếu chế độ local không được sử dụng, một sơ đồ Postgres mới (với dữ liệu `subquery_` ban đầu) và các bảng dự án tương ứng sẽ được khởi tạo.

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
