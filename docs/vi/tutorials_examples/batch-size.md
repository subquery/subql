# Làm cách nào để thay đổi kích thước lô tìm nạp blockchain?

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giới thiệu

Kích thước lô mặc định là 100, nhưng điều này có thể được thay đổi bằng cách sử dụng lệnh bổ sung ` --batch-size = xx `.

Bạn cần làm điều này bằng dòng lệnh như một cờ bổ sung hoặc nếu bạn đang sử dụng Docker, hãy sửa đổi docker-compos.yml thành:

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    restart: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - ./:/app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

Ví dụ này đặt kích thước lô thành 50.

## Tại sao phải thay đổi kích thước lô?

Việc sử dụng kích thước lô nhỏ hơn có thể làm giảm mức sử dụng bộ nhớ và không khiến người dùng bị treo cho các truy vấn lớn. Nói cách khác, ứng dụng của bạn có thể phản hồi nhanh hơn. 