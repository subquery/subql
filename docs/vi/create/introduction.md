# Tạo một dự án SubQuery

Trong hướng dẫn [bắt đầu nhan](/quickstart/quickstart.md), chúng tôi đã xem nhanh một ví dụ để bạn hiểu SubQuery là gì và nó hoạt động như thế nào. Ở đây chúng ta sẽ xem xét kỹ hơn quy trình làm việc khi tạo dự án của bạn và các tệp chính mà bạn sẽ làm việc.

## Quy trình làm việc cơ bản
Một số ví dụ sau sẽ giả sử bạn đã khởi tạo thành công gói khởi động trong phần [Bắt đầu nhanh](../quickstart/quickstart.md). Từ gói khởi động đó, chúng tôi sẽ hướng dẫn quy trình chuẩn để tùy chỉnh và triển khai dự án SubQuery của bạn.

1. Khởi tạo dự án của bạn bằng `subql init PROJECT_NAME`
2. Cập nhật tệp kê khai (`project.yaml`) để bao gồm thông tin về chuỗi khối của bạn và các thực thể mà bạn sẽ ánh xạ - xem [Manifest File](./manifest.md)
3. Tạo các thực thể GraphQL trong lược đồ của bạn (`schema.graphql`) xác định hình dạng của dữ liệu mà bạn sẽ trích xuất và duy trì để truy vấn - xem [Lược đồ GraphQL](./graphql.md)
4. Thêm tất cả các hàm ánh xạ (ví dụ: `mappingHandlers.ts`) mà bạn muốn gọi để chuyển đổi dữ liệu chuỗi thành các thực thể GraphQL mà bạn đã xác định - xem [Ánh xạ](./mapping.md)
5. Tạo, xây dựng và xuất code của bạn lên Dự án SubQuery (hoặc chạy trong node cục bộ của riêng bạn) - xem [Chạy và truy vấn Dự án dành cho người mới bắt đầu của bạn](./quickstart.md#running-and-querying-your-starter-project) trong hướng dẫn bắt đầu nhanh của chúng tôi.

## Cấu trúc thư mục

Bản đồ sau cung cấp tổng quan về cấu trúc thư mục của một dự án SubQuery khi lệnh `init` được chạy.

```
- project-name
  L package.json
  L project.yaml
  L README.md
  L schema.graphql
  L tsconfig.json
  L docker-compose.yml
  L src
    L index.ts
    L mappings
      L mappingHandlers.ts
  L .gitignore
```

Ví dụ:

![Cấu trúc thư mục SubQuery](/assets/img/subQuery_directory_stucture.png)

## Tạo mã

Bất cứ khi nào bạn thay đổi các thực thể GraphQL của mình, bạn phải tạo lại thư mục loại của mình bằng lệnh sau.

```
yarn codegen
```

Thao tác này sẽ tạo một thư mục mới (hoặc cập nhật thư mục `src/styles` hiện có chứa các lớp thực thể được tạo cho mỗi loại mà bạn đã xác định trước đó trong `schema.graphql`. Các lớp này cung cấp quyền truy cập tải, đọc và ghi thực thể an toàn về kiểu đối với các trường thực thể - xem thêm về quy trình này trong [Lược đồ GraphQL](./graphql.md).

## Xây dựng

Để chạy Dự án SubQuery của bạn trên một Node SubQuery được lưu trữ cục bộ, trước tiên bạn cần xây dựng công việc của mình.

Chạy lệnh xây dựng từ thư mục gốc của dự án.

```shell
# Yarn
yarn build

# NPM
npm run-script build
```

## Ghi nhật ký

Phương thức `console.log` **không còn được hỗ trợ**. Thay vào đó, mô-đun `logger` đã được đưa vào các loại, có nghĩa là chúng tôi có thể hỗ trợ trình ghi nhật ký có thể chấp nhận các cấp độ ghi nhật ký khác nhau.

```typescript
logger.info('Info level message');
logger.debug('Debugger level message');
logger.warn('Warning level message');
```

Để sử dụng `logger.info` hoặc `logger.warn`, chỉ cần đặt dòng vào tệp ánh xạ của bạn.

![logging.info](/assets/img/logging_info.png)

Để sử dụng `logger.debug`, cần thực hiện thêm một bước. Thêm `--log-level = debug` vào dòng lệnh của bạn.

Nếu bạn đang chạy vùng chứa docker, hãy thêm dòng này vào tệp `docker-comp.yaml` của bạn.

![logging.debug](/assets/img/logging_debug.png)

Bây giờ bạn sẽ thấy đăng nhập mới trong màn hình đầu cuối.

![logging.debug](/assets/img/subquery_logging.png)
