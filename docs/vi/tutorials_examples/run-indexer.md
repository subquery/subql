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

## Inspecting Postgres

If you navigate to Postgres, you should see two tables created. `public.subqueries` and `subquery_1.starter_entities`.

`public.subqueries` only contains 1 row which the indexer checks upon start up to “understand the current state” so it knows where to continue from. The `starter_entities` table contains the indexes. To view the data, run `select (*) from subquery_1.starter_entities`.
