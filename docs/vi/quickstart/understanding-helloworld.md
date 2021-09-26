# Giải thích Hello World

Tại bài [Hướng dẫn nhanh Hello World](helloworld-localhost.md), chúng tôi sử dụng những lệnh đơn giản và nhanh để triển khai một ví dụ. Điều này giúp bạn hiểu tất cả những yêu cầu và có thể sử dụng playground tại máy cá nhân để tạo một truy vấn đơn giản và lấy dữ liệu từ SubQuery. Từ đó, chúng ta có một góc nhìn gần hơn về ý nghĩa của các lệnh trên.

## subql init

Lệnh đầu tiên chúng tôi chạy là `subql init --starter subqlHelloWorld`.

Lệnh này khá nặng và tạo ra một loạt các tập tin cho bạn. Như đã nhắc đến ở [tài liệu chính thức](quickstart.md#configure-and-build-the-starter-project), bạn sẽ làm việc nhiều nhất với những tập tin sau:

- Tệp kê khai trong `project.yaml`
- Lược đồ GraphQL trong `schema.graphql`
- Các chức năng ánh xạ trong thư mục `src/mappings/`

![các tệp chính của subql](/assets/img/main_subql_files.png)

Những tập tin đó là cốt lõi của tất cả những gì chúng ta sẽ làm. Do đó, chúng tôi sẽ dành nhiều thời gian hơn cho các tệp này trong một bài viết khác. Mặc dù vậy, chúng ta chỉ cần biết rằng schema chứa mô tả dữ liệu mà người dùng có thể yêu cầu từ API SubQuery, tệp dự án yaml chứa các tham số kiểu "cấu hình" và tất nhiên là mappingHandlers viết bằng typescript chứa các hàm biến đổi dữ liệu.

## yarn install

Tiếp theo chúng ta chạy lệnh `yarn install` hoặc là `npm install`.

> Nhắc lại một chút, Node Package Manager hoặc npm được phát hành vào năm 2010 và trở thành trình quản lý package phổ biến cho các nhà phát triển JavaScript. Đó là package mặc định và được tự động cài đặt khi bạn cài đặt Node.js trên hệ thống của bạn. Yarn được Facebook phát hành vào năm 2016 với mục đích giải quyết một số thiếu sót về hiệu suất và bảo mật khi làm việc với npm (tại thời điểm đó).

Những điều yarn làm là nhìn vào tập tin `package.json` và tải về toàn bộ những điều kiện. Nhìn vào tập tin `package.json`, trông không giống như có rất nhiều tập tin điều kiện, tuy nhiên khi bạn chạy lệnh, bạn sẽ thấy rằng 18,983 tập tin đã được thêm vào. Đó là bởi vì mỗi một điều kiện lại phụ thuộc vào rất nhiều điều kiện khác.

![các tệp chính của subql](/assets/img/dependencies.png)

## yarn codegen

Tiếp theo chúng ta chạy lệnh `yarn codegen` hoặc `npm run-script codegen`. Lệnh đó sẽ đọc lược đồ GraphQL (ở trong tập tin `schema.graphql`) và tự tạo ra tập tin mẫu typescripts tương ứng (Do đó tập tin đầu ra sẽ có đuôi .ts). Bạn sẽ không bao giờ phải thay đổi những tập tin tự sinh ra, chỉ cần thay đổi tập tin nguồn `schema.graphql`.

![các tệp chính của subql](/assets/img/typescript.png)

## yarn build

Chạy lệnh `yarn build` hoặc `npm run-script build`. Lệnh này rất quen thuộc với các lập trình viên có kinh nghiệm. Nó tạo ra một thư mục phân phối thực hiện những việc như tối ưu hóa mã chuẩn bị cho việc triển khai.

![các tệp chính của subql](/assets/img/distribution_folder.png)

## docker-compose

Bước cuối cùng sẽ bao gồm các lệnh docker `docker-compose pull && docker-compose up` (có thể chạy độc lập cũng được). Lệnh `pull` kéo toàn bộ các ảnh yêu cầu từ Docker Hub và lệnh `up` sẽ dựng container.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

Khi container khởi chạy, bạn sẽ thấy màn hình xổ ra rất nhiều dòng chữ thể hiện trạng thái của node và của GraphQL. Bạn sẽ thấy:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

mà bạn biết rằng nút SubQuery đã bắt đầu đồng bộ hóa.

## Tóm lược

Bây giờ bạn đã có một cái nhìn sâu sắc về những gì đang xảy ra, câu hỏi đặt ra là bắt đầu từ đâu? Nếu bạn cảm thấy khó hiểu, bạn có thể quay lại bài làm thế nào để [tạo một dự án](../create/introduction.md) và đọc thêm về những tập tin chính. Tập tin dự án, lược đồ GraphQL, và những tập tin ánh xạ.

Nếu không, hãy tiếp tục xem hướng dẫn, nơi chúng tôi xem xét cách có thể chạy ví dụ Hello World này trên cơ sở hạ tầng được lưu trữ của SubQuery, chúng tôi sẽ xem xét việc sửa đổi khối bắt đầu và sẽ đi sâu hơn về việc chạy các dự án SubQuery bằng cách chạy sẵn có và các dự án mã nguồn mở.
