# Làm thế nào để bắt đầu ở một block height khác?

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/ZiNSXDMHmBk" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giới thiệu

Theo mặc định, tất cả các dự án khởi động bắt đầu đồng bộ hóa chuỗi khối từ khối khởi đầu. Nói cách khác, từ khối 1. Đối với các blockchains lớn, điều này thường có thể mất vài ngày hoặc thậm chí vài tuần để đồng bộ hóa hoàn toàn.

Để bắt đầu đồng bộ hóa nút SubQuery từ height khác 0, tất cả những gì bạn phải làm là sửa đổi tệp project.yaml của mình và thay đổi khóa startBlock.

Dưới đây là tệp project.yaml trong đó khối bắt đầu đã được đặt thành 1.000.000

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

## Tại sao không bắt đầu từ con số không?

Lý do chính là nó có thể giảm thời gian đồng bộ hóa blockchain. Điều này có nghĩa là nếu bạn chỉ quan tâm đến các giao dịch trong 3 tháng gần nhất, bạn chỉ có thể đồng bộ hóa giá trị 3 tháng gần nhất nghĩa là thời gian chờ đợi ít hơn và bạn có thể bắt đầu phát triển của mình nhanh hơn.

## Hạn chế của việc không bắt đầu từ con số 0 là gì?

Hạn chế rõ ràng nhất sẽ là bạn sẽ không thể truy vấn dữ liệu trên blockchain cho các khối mà bạn không có.

## Làm thế nào để tìm ra chiều cao blockchain hiện tại?

Nếu bạn đang sử dụng mạng Polkadot, bạn có thể truy cập [ https://polkascan.io/ ](https://polkascan.io/), chọn mạng và sau đó xem hình "Khối được hoàn thiện".

## Tôi có phải xây dựng lại hoặc tạo mã không?

Không. Bởi vì bạn đang sửa đổi tệp project.yaml, về cơ bản là tệp cấu hình, bạn sẽ không phải xây dựng lại hoặc tạo lại mã typecript.
