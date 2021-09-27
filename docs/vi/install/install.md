# Cài đặt SubQuery

Có nhiều thành phần được yêu cầu để tạo một dự án SubQuery. Thành phần [@subql/node](https://github.com/subquery/subql/tree/docs-new-section/packages/node) là bắt buộc để chạy trình chỉ mục. Thư viện [@subql/query](https://github.com/subquery/subql/tree/docs-new-section/packages/query) là bắt buộc để tạo các truy vấn.

## Cài đặt @subql/cli

Thư viện [@subql/cli](https://github.com/subquery/subql/tree/docs-new-section/packages/cli) giúp tạo khung hoặc giàn cho dự án, nghĩa là bạn không phải bắt đầu từ đầu.

Cài đặt SubQuery CLI trên toàn cầu trên thiết bị đầu cuối (terminal) của bạn bằng cách sử dụng Yarn hoặc NPM:

```shell
# Yarn
yarn global add @subql/cli

# NPM
npm install -g @subql/cli
```

Sau đó, bạn có thể chạy trợ giúp để xem các lệnh có sẵn và cách sử dụng do CLI cung cấp:

```shell
subql help
```

## Cài đặt @subql/node

Nút SubQuery là một hành động trích xuất dữ liệu blockchain dựa trên chất nền cho mỗi dự án SubQuery và lưu nó vào cơ sở dữ liệu Postgres.

Cài đặt nút SubQuery trên toàn cầu trên thiết bị đầu cuối của bạn bằng cách sử dụng Yarn hoặc NPM:

```shell
# Yarn
yarn global add @subql/node

# NPM
npm install -g @subql/node
```

Sau khi cài đặt, bạn có thể tạo một nút bằng cách nhập:

```shell
subql-node <command>
```

> Lưu ý: Nếu bạn đang sử dụng Docker hoặc lưu trữ dự án của mình trên SubQuery Projects, bạn có thể bỏ qua bước này. Bởi vì nút SubQuery đã được cung cấp trong vùng chứa Docker và cơ sở hạ tầng lưu trữ.

## Cài đặt @subql/query

Thư viện truy vấn SubQuery cung cấp dịch vụ cho phép bạn truy vấn dự án của mình trong môi trường "sân chơi" thông qua trình duyệt của bạn.

Cài đặt truy vấn SubQuery trên toàn cầu trên thiết bị đầu cuối của bạn bằng cách sử dụng Yarn hoặc NPM:

```shell
# Yarn
yarn global add @subql/query

# NPM
npm install -g @subql/query
```

> Lưu ý: Nếu bạn đang sử dụng Docker hoặc lưu trữ dự án của mình trên SubQuery Projects, bạn cũng có thể bỏ qua bước này. Bởi vì nút SubQuery đã được cung cấp trong vùng chứa Docker và cơ sở hạ tầng lưu trữ.
