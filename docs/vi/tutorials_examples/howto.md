# Hướng dẫn

## Làm sao để bắt đầu tại một block khác với mặc định?

### Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Giới thiệu

Theo mặc định, tất cả các dự án khởi động bắt đầu đồng bộ hóa blockchain từ khối nguyên thủy (Genesis Block). Nói cách khác, từ block số 1. Đối với các blockchain lớn, quá trình đồng bộ hóa này thường mất vài ngày, thậm chí là vài tuần để hoàn thành.

Để bắt đầu đồng bộ hóa node (nút) SubQuery từ một nấc độ cao block khác 0, bạn cần phải sửa đổi tệp project.yaml của mình và thay đổi key về block khởi đầu (startBlock).

Trong tệp project.yaml dưới đây, block khởi đầu đã được đặt thành 1.000.000

```shell
specVersion: 0.0.1
description: ""
repository: ""
schema: ./schema.graphql
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
dataSources:
  - name: main
    kind: substrate/Runtime
    startBlock: 1000000
    mapping:
      handlers:
        - handler: handleBlock
          kind: substrate/BlockHandler
```

### Tại sao lại không bắt đầu từ block 0?

Nguyên nhân chủ yếu là vì làm vậy sẽ giúp giảm thời gian đồng bộ hóa blockchain. Điều này nghĩa là nếu chỉ quan tâm đến các giao dịch trong 3 tháng gần nhất, bạn có thể chỉ đồng bộ hóa những block trong 3 tháng gần nhất - như vậy thời gian đồng bộ sẽ ngắn hơn và bạn có thể nhanh chóng bắt tay vào công đoạn phát triển dự án.

### Hạn chế của việc này là gì?

Hạn chế rõ ràng nhất sẽ là bạn sẽ không thể truy vấn dữ liệu trên blockchain đối với các block mà bạn không có.

### Làm sao để biết blockchain hiện đang có nấc độ cao là bao nhiêu?

Nếu đang sử dụng mạng Polkadot, bạn có thể truy cập vào trang [https://polkascan.io/](https://polkascan.io/), chọn mạng, sau đó xem tại mục "Block đã hoàn thiện".

### Tôi có cần xây dựng hoặc tạo lại code không?

Không. Bởi vì bạn đang sửa đổi tệp project.yaml (về cơ bản thì đây là tệp cấu hình), vậy nên bạn sẽ không phải xây dựng hoặc tạo lại code typecript.

## Làm cách nào để thay đổi kích thước lô (batch size) khi tìm nạp blockchain?

### Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

### Giới thiệu

Kích thước mặc định là 100, nhưng bạn có thể thay đổi bằng cách sử dụng lệnh bổ sung `--batch-size=xx`.

Bạn cần thêm đoạn trên vào dòng lệnh để tạo thành một flag bổ sung, còn nếu bạn đang sử dụng Docker, hãy sửa đổi tệp docker-compos.yml như sau:

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

Trong ví dụ này, batch size đã được đổi thành 50.

### Tại sao lại cần thay đổi batch size?

Việc sử dụng batch size nhỏ hơn có thể làm giảm mức sử dụng bộ nhớ và không khiến người dùng bị treo khi muốn thực hiện các truy vấn lớn. Nói cách khác, ứng dụng của bạn sẽ có tốc độ phản hồi nhanh hơn. Tuy nhiên, làm vậy sẽ khiến có thêm nhiều lệnh gọi API được thực hiện, vậy nên nếu bạn bị tính phí trên cơ sở đầu vào/đầu ra hoặc blockchain của bạn có giới hạn API ở đâu đó thì điều này có thể gây bất lợi cho bạn.