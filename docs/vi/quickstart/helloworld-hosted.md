# Hello World (được lưu trữ trên SubQuery)

Mục đích của bài quick start này là hướng dẫn cách bạn có thể chạy dự án khởi động mặc định trong SubQuery Projects (dịch vụ được quản lý của chúng tôi) trong một vài bước đơn giản.

Chúng tôi sẽ sử dụng dự án khởi động đơn giản (và mọi thứ chúng tôi đã học được cho đến nay) nhưng thay vì chạy nó cục bộ trong Docker, chúng tôi sẽ tận dụng cơ sở hạ tầng lưu trữ được quản lý của SubQuery. Nói cách khác, chúng tôi để SubQuery thực hiện tất cả các công việc nặng nhọc, vận hành và quản lý cơ sở hạ tầng sản xuất.

## Mục tiêu học tập

Khi kết thúc quá trình quick start này, bạn sẽ:

- hiểu các điều kiện tiên quyết cần thiết
- có thể host một dự án trong [Dự án SubQuery](https://project.subquery.network/)
- chạy một truy vấn đơn giản để lấy chiều cao khối của mạng chính Polkadot bằng cách sử dụng playground
- chạy một truy vấn GET đơn giản để lấy chiều cao khối của mạng chính Polkadot bằng cách sử dụng cURL

## Đối tượng mục tiêu

Hướng dẫn này hướng tới các nhà phát triển mới đã có một số kinh nghiệm phát triển và muốn tìm hiểu thêm về SubQuery.

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/b-ba8-zPOoo" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Điều kiện tiên quyết

Bạn sẽ cần:

- một tài khoản GitHub

## Bước 1: Tạo dự án của bạn

Hãy tạo một dự án có tên là subql_hellowworld và chạy cài đặt bắt buộc, codegen và xây dựng với trình quản lý gói yêu thích của bạn.

```shell
> subql init --starter subqlHelloWorld
yarn install
yarn codegen
yarn build
```

KHÔNG chạy các lệnh docker.

## Bước 2: Tạo repo GitHub

Trong GitHub, hãy tạo một repository công khai mới. Cung cấp tên và đặt khả năng hiển thị của bạn ở chế độ công khai. Ở đây, mọi thứ được giữ làm mặc định.

![create github repo](/assets/img/github_create_new_repo.png)

Hãy lưu ý URL GitHub của bạn, URL này phải được công khai để SubQuery có thể truy cập.

![create github repo](/assets/img/github_repo_url.png)

## Bước 3: Push tới GitHub

Quay lại thư mục dự án của bạn, khởi tạo nó dưới dạng thư mục git. Nếu không, bạn có thể gặp lỗi "nghiêm trọng: không phải là kho lưu trữ git (hoặc bất kỳ thư mục mẹ nào): .git"

```shell
git init
```

Sau đó, thêm một repository từ xa bằng lệnh:

```shell
git remote add origin https://github.com/seandotau/subqlHelloWorld.git
```

Về cơ bản, điều này đặt kho lưu trữ từ xa của bạn thành “https://github.com/seandotau/subqlHelloWorld.git” và đặt cho nó tên “origin” là danh pháp tiêu chuẩn cho repository từ xa trong GitHub.

Tiếp theo, chúng tôi thêm code vào repo của chúng tôi bằng các lệnh sau:

```shell
> git add .
> git commit -m "First commit"
[master (root-commit) a999d88] First commit
10 files changed, 3512 insertions(+)
create mode 100644 .gitignore
create mode 100644 README.md
create mode 100644 docker-compose.yml
create mode 100644 package.json
create mode 100644 project.yaml
create mode 100644 schema.graphql
create mode 100644 src/index.ts
create mode 100644 src/mappings/mappingHandlers.ts
create mode 100644 tsconfig.json
create mode 100644 yarn.lock
> git push origin master
Enumerating objects: 14, done.
Counting objects: 100% (14/14), done.
Delta compression using up to 12 threads
Compressing objects: 100% (13/13), done.
Writing objects: 100% (14/14), 59.35 KiB | 8.48 MiB/s, done.
Total 14 (delta 0), reused 0 (delta 0)
To https://github.com/seandotau/subqlHelloWorld.git
 * [new branch]      master -> master

```

Lệnh push có nghĩa là "vui lòng đẩy mã của tôi ĐẾN kho lưu trữ gốc TỪ kho lưu trữ cục bộ chính của tôi". Làm mới GitHub sẽ hiển thị tất cả mã trong GitHub.

![First commit](/assets/img/first_commit.png)

Bây giờ bạn đã có code của mình vào GitHub, hãy xem cách chúng tôi có thể lưu trữ code đó trong Dự án SubQuery.

## Bước 4: Tạo dự án của bạn

Điều hướng đến [https://project.subquery.network](https://project.subquery.network) và đăng nhập bằng tài khoản GitHub của bạn.

![Chào mừng bạn đến với Dự án SubQuery](/assets/img/welcome_to_subquery_projects.png)

Sau đó, tạo một dự án mới,

![Chào mừng bạn đến với Dự án SubQuery](/assets/img/subquery_create_project.png)

Và điền vào các trường khác nhau với các chi tiết thích hợp.

- **Tài khoản GitHub:** Nếu bạn có nhiều tài khoản GitHub, hãy chọn tài khoản mà dự án này sẽ được tạo. Các dự án được tạo trong tài khoản tổ chức GitHub được chia sẻ giữa các thành viên trong tổ chức đó.
- **Tên dự án:** Đặt tên cho dự án của bạn ở đây.
- **Phụ đề:** Cung cấp phụ đề cho dự án của bạn.
- **Mô tả:** Giải thích những gì dự án SubQuery của bạn thực hiện.
- **GitHub Repository URL:** Đây phải là URL GitHub hợp lệ tới kho lưu trữ công cộng có chứa dự án SubQuery của bạn. Tệp schema.graphql phải nằm trong thư mục root của bạn.
- **Ẩn dự án:** Nếu được chọn, điều này sẽ ẩn dự án khỏi trình khám phá SubQuery công khai. Hãy bỏ chọn mục này nếu bạn muốn chia sẻ SubQuery của mình với cộng đồng!

![Tạo thông số SubQuery](/assets/img/create_subquery_project_parameters.png)

Khi bạn nhấp vào tạo, bạn sẽ được đưa đến trang tổng quan của mình.

![Bảng điều khiển Dự án SubQuery](/assets/img/subquery_project_dashboard.png)

Trang tổng quan chứa nhiều thông tin hữu ích như mạng mà nó đang sử dụng, URL kho lưu trữ GitHub của mã nguồn đang chạy, thời điểm nó được tạo và cập nhật lần cuối và đặc biệt là chi tiết triển khai.

## Bước 5: Triển khai dự án của bạn

Bây giờ bạn đã tạo dự án của mình trong SubQuery Projects, thiết lập hành vi hiển thị, bước tiếp theo là triển khai dự án của bạn để làm cho nó hoạt động. Việc triển khai một phiên bản sẽ kích hoạt hoạt động lập chỉ mục SubQuery mới bắt đầu và thiết lập dịch vụ truy vấn bắt buộc để bắt đầu chấp nhận các yêu cầu GraphQL. Bạn cũng có thể triển khai các phiên bản mới cho các dự án hiện có tại đây.

Bạn có thể chọn triển khai cho các môi trường khác nhau như production slot hoặc staging slot. Ở đây, chúng tôi sẽ triển khai cho 1 production slot. Nhấp vào nút "Triển khai" sẽ xuất hiện màn hình với các trường sau:

![Triển khai đến production slot](/assets/img/deploy_production_slot.png)

- **Commit Hash of new Version:** Từ GitHub, chọn cam kết chính xác của cơ sở mã dự án SubQuery mà bạn muốn triển khai
- **Indexer Version:** Đây là phiên bản của dịch vụ nút SubQuery mà bạn muốn chạy SubQuery này. Xem [@subql/node](https://www.npmjs.com/package/@subql/node)
- **Query Version:** Đây là phiên bản của dịch vụ truy vấn SubQuery mà bạn muốn chạy SubQuery này. Xem [@subql/query](https://www.npmjs.com/package/@subql/query)

Bởi vì chúng tôi chỉ có một commit, chỉ có một tùy chọn duy nhất trong trình đơn thả xuống. Chúng tôi cũng sẽ làm việc với phiên bản mới nhất của trình lập chỉ mục và phiên bản truy vấn, vì vậy chúng tôi sẽ chấp nhận các giá trị mặc định và sau đó nhấp vào "Deploy Update".

Sau đó, bạn sẽ thấy việc triển khai của mình ở trạng thái “Processing”. Tại đây, mã của bạn đang được triển khai trên cơ sở hạ tầng được quản lý của SubQuery. Về cơ bản, một máy chủ đang hoạt động theo yêu cầu và được cung cấp cho bạn. Quá trình này sẽ mất vài phút vì vậy hãy dành thời gian để uống một ly cà phê!

![Triển khai đang thực hiện](/assets/img/deployment_processing.png)

Việc triển khai hiện đang chạy.

![Triển khai đang chạy](/assets/img/deployment_running.png)

## Bước 6: Kiểm tra dự án của bạn

Để kiểm tra dự án của bạn, hãy nhấp vào 3 dấu chấm lửng và chọn "View on SubQuery Explorer".

![Xem dự án truy vấn con](/assets/img/view_on_subquery.png)

Thao tác này sẽ đưa bạn đến "Playground" quen thuộc, nơi bạn có thể nhấp vào nút play và xem kết quả của truy vấn.

![Subquery playground](/assets/img/subquery_playground.png)

## Bước 7: Bước thêm

Đối với những người sắc sảo trong số chúng ta, bạn sẽ nhớ lại rằng trong mục tiêu học tập, điểm cuối cùng là chạy một truy vấn GET đơn giản. Để làm điều này, chúng tôi sẽ cần lấy "Query Endpoint" được hiển thị trong chi tiết triển khai.

![Kết thúc truy vấn](/assets/img/query_endpoint.png)

Sau đó, bạn có thể gửi một yêu cầu GET tới điểm cuối này bằng cách sử dụng ứng dụng khách yêu thích của bạn như [Postman](https://www.postman.com/) hoặc [Mockoon](https://mockoon.com/) hoặc qua cURL trong thiết bị đầu cuối của bạn. Để đơn giản, cURL sẽ được hiển thị bên dưới.

Lệnh curl để chạy là:

```shell
curl https://api.subquery.network/sq/seandotau/subqueryhelloworld -d "query=query { starterEntities (first: 5, orderBy: CREATED_AT_DESC) { totalCount nodes { id field1 field2 field3 } } }"
```

đưa ra kết quả của:

```shell
{"data":{"starterEntities":{"totalCount":23098,"nodes":[{"id":"0x29dfe9c8e5a1d51178565c2c23f65d249b548fe75a9b6d74cebab777b961b1a6","field1":23098,"field2":null,"field3":null},{"id":"0xab7d3e0316a01cdaf9eda420cf4021dd53bb604c29c5136fef17088c8d9233fb","field1":23097,"field2":null,"field3":null},{"id":"0x534e89bbae0857f2f07b0dea8dc42a933f9eb2d95f7464bf361d766a644d17e3","field1":23096,"field2":null,"field3":null},{"id":"0xd0af03ab2000a58b40abfb96a61d312a494069de3670b509454bd06157357db6","field1":23095,"field2":null,"field3":null},{"id":"0xc9f5a92f4684eb039e11dffa4b8b22c428272b2aa09aff291169f71c1ba0b0f7","field1":23094,"field2":null,"field3":null}]}}}

```

Khả năng đọc không phải là mối quan tâm ở đây vì bạn có thể sẽ có một số mã giao diện người dùng để sử dụng và phân tích cú pháp phản hồi JSON này.

## Tóm lược

Trong phần khởi động nhanh được lưu trữ trên SubQuery này, chúng tôi đã cho thấy việc thực hiện một dự án Subql và triển khai nó cho [Dự án SubQuery](https://project.subquery.network) nhanh chóng và dễ dàng như thế nào để thuận tiện cho bạn. Có một inbuilt playground có để chạy các truy vấn khác nhau cũng như một điểm cuối API để tích hợp mã của bạn.
