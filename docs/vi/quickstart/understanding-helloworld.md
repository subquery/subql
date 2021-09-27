# Giải thích Hello World

Trong [hướng dẫn bắt đầu nhanh Hello World](helloworld-localhost.md), chúng tôi đã chạy qua một số lệnh đơn giản và rất nhanh chóng có một ví dụ về thiết lập và chạy. Điều này cho phép bạn đảm bảo rằng bạn đã có sẵn tất cả các điều kiện tiên quyết và có thể sử dụng một sân chơi cục bộ để thực hiện một truy vấn đơn giản để lấy dữ liệu đầu tiên từ SubQuery. Ở đây, chúng ta xem xét kỹ hơn ý nghĩa của tất cả các lệnh đó.

## subql init

Lệnh đầu tiên chúng tôi chạy là `subql init --starter subqlHelloWorld`.

Điều này tạo ra công việc nặng nhọc và một loạt các tệp cho bạn. Như đã lưu ý trong [tài liệu chính thức](quickstart.md#configure-and-build-the-starter-project), bạn chủ yếu sẽ làm việc trên các tệp sau:

- Tệp kê khai trong `project.yaml`
- Lược đồ GraphQL trong `schema.graphql`
- Các chức năng ánh xạ trong thư mục `src/mappings/`

![các tệp chính của subql](/assets/img/main_subql_files.png)

Những tệp này là cốt lõi của mọi thứ chúng tôi làm. Do đó, chúng tôi sẽ dành nhiều thời gian hơn cho các tệp này trong một bài viết khác. Mặc dù vậy, giờ bạn chỉ cần biết rằng lược đồ chứa mô tả dữ liệu mà người dùng có thể yêu cầu từ API SubQuery, tệp dự án yaml chứa các tham số kiểu "cấu hình" và tất nhiên là mappingHandlers chứa các typecript chứa các hàm biến đổi dữ liệu.

## yarn install

Điều tiếp theo chúng tôi làm là `yarn install`. `npm install` cũng có thể được sử dụng.

> Một bài học lịch sử ngắn. Node Package Manager hay npm lần đầu tiên được phát hành vào năm 2010 và là một trình quản lý gói cực kỳ phổ biến trong số các nhà phát triển JavaScript. Đây là gói mặc định được cài đặt tự động bất cứ khi nào bạn cài đặt Node.js trên hệ thống của mình. Yarn ban đầu được Facebook phát hành vào năm 2016 với mục đích giải quyết một số thiếu sót về hiệu suất và bảo mật khi làm việc với npm (tại thời điểm đó).

Những gì yarn làm là xem tệp `package.json` và tải xuống nhiều phần phụ thuộc khác. Khi nhìn vào tệp `package.json`, có vẻ như không có nhiều tệp phụ thuộc, nhưng khi bạn chạy lệnh sẽ thấy 18,983 tệp đã được thêm vào. Điều này là do mỗi phụ thuộc sẽ có các phụ thuộc riêng của nó.

![các tệp chính của subql](/assets/img/dependencies.png)

## yarn codegen

Sau đó, chúng tôi chạy `mã tạo yarn` hoặc `npm run-script codegen`. Điều này giúp tìm nạp giản đồ GraphQL (trong `schema.graphql`) và tạo các tệp mô hình typecript được liên kết (Do đó, các tệp đầu ra sẽ có phần mở rộng .ts). Bạn không bao giờ được thay đổi bất kỳ tệp nào trong số các tệp đã tạo này, chỉ thay đổi tệp `schema.graphql` nguồn.

![các tệp chính của subql](/assets/img/typescript.png)

## yarn build

Sau đó, `yarn build` hoặc `npm run-script build` đã được thực thi. Điều này sẽ quen thuộc đối với các lập trình viên dày dạn kinh nghiệm. Nó tạo ra một thư mục phân phối thực hiện những việc như tối ưu hóa mã chuẩn bị cho việc triển khai.

![các tệp chính của subql](/assets/img/distribution_folder.png)

## docker-compose

Bước cuối cùng là lệnh docker kết hợp `docker-compose kéo && docker-compose lên` (cũng có thể chạy riêng). Lệnh `pull` lấy tất cả các hình ảnh cần thiết từ Docker Hub và lệnh `up` khởi động vùng chứa.

```shell
> docker-compose pull
Pulling postgres        ... done
Pulling subquery-node   ... done
Pulling graphql-engine  ... done
```

Khi vùng chứa được khởi động, bạn sẽ thấy thiết bị đầu cuối xuất ra rất nhiều văn bản hiển thị trạng thái của nút và công cụ GraphQL. Đó là khi bạn thấy:

```
subquery-node_1   | 2021-06-06T02:04:25.490Z <fetch> INFO fetch block [1, 100]
```

mà bạn biết rằng nút SubQuery đã bắt đầu đồng bộ hóa.

## Tóm lược

Bây giờ bạn đã có một cái nhìn sâu sắc về những gì đang xảy ra bên dưới, câu hỏi đặt ra là bắt đầu từ đâu? Nếu bạn cảm thấy tự tin, bạn có thể bắt đầu tìm hiểu về cách [tạo một dự án](../create/introduction.md) và tìm hiểu thêm về ba tệp chính. Tệp kê khai, lược đồ GraphQL và tệp ánh xạ.

Nếu không, hãy tiếp tục xem hướng dẫn, nơi chúng tôi xem xét cách có thể chạy ví dụ Hello World này trên cơ sở hạ tầng được lưu trữ của SubQuery, chúng tôi sẽ xem xét việc sửa đổi khối bắt đầu và sẽ đi sâu hơn về việc chạy các dự án SubQuery bằng cách chạy sẵn có và các dự án mã nguồn mở.
