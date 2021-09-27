# Làm thế nào để chạy một nút chỉ mục?

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/QfNsR12ItnA" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giới thiệu

Chạy một nút chỉ mục là một tùy chọn khác ngoài việc sử dụng Docker hoặc có một dự án được lưu trữ cho bạn tại [ Dự án SubQuery ](https://project.subquery.network/). Nó đòi hỏi nhiều thời gian và nỗ lực hơn nhưng sẽ nâng cao hiểu biết của bạn về cách SubQuery hoạt động.

## Postgres

Chạy một nút chỉ mục trên cơ sở hạ tầng của bạn sẽ yêu cầu thiết lập cơ sở dữ liệu Postgres. Bạn có thể cài đặt Postgres [ tại đây ](https://www.postgresql.org/download/) và đảm bảo phiên bản 12 trở lên.

## Cài đặt subql / node

Sau đó, để chạy một nút SubQuery, hãy chạy lệnh sau:

```shell
npm install -g @subql/node
```

Cờ -g có nghĩa là cài đặt nó trên toàn cầu, có nghĩa là trên OSX, vị trí sẽ là / usr / local / lib / node_modules.

Sau khi cài đặt, bạn có thể kiểm tra phiên bản bằng cách chạy:

```shell
> subql-node --version
0.19.1
```

## Đặt cấu hình DB

Tiếp theo, bạn cần đặt các biến môi trường sau:

```shell
export DB_USER=postgres
export DB_PASS=postgres
export DB_DATABASE=postgres
export DB_HOST=localhost
export DB_PORT=5432
```

Tất nhiên, nếu bạn có các giá trị khác nhau cho các phím trên, vui lòng điều chỉnh cho phù hợp. Lưu ý rằng lệnh ` env ` sẽ hiển thị các biến môi trường hiện tại và quá trình này chỉ đặt các giá trị này tạm thời. Có nghĩa là, chúng chỉ có hiệu lực trong khoảng thời gian của phiên đầu cuối. Để đặt chúng vĩnh viễn, hãy lưu trữ chúng trong ~/bash_profile của bạn.

## Lập chỉ mục một dự án

Để bắt đầu lập chỉ mục một dự án, hãy điều hướng vào thư mục dự án của bạn và chạy lệnh sau:

```shell
subql-node -f .
```

Nếu bạn không có dự án nào hữu ích, hãy `git clone https://github.com/subquery/subql-helloworld`. Bạn sẽ thấy nút lập chỉ mục bắt đầu hoạt động và bắt đầu lập chỉ mục các khối.

## Kiểm tra Postgres

Nếu bạn điều hướng đến Postgres, bạn sẽ thấy hai bảng được tạo. `public.subqueries` và `subquery_1.starter_entities`.

`public.subqueries` chỉ chứa 1 hàng mà trình lập chỉ mục kiểm tra khi khởi động để "hiểu trạng thái hiện tại" để nó biết phải tiếp tục từ đâu. Bảng `starter_entities` chứa các chỉ mục. Để xem dữ liệu, hãy chạy `select (*) from subquery_1.starter_entities`.
