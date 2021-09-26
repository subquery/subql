# Hướng dẫn & Các ví dụ

Ở đây chúng tôi sẽ liệt kê các hướng dẫn của chúng tôi và khám phá các ví dụ khác nhau để giúp bạn thiết lập và chạy một cách dễ dàng và nhanh nhất.

## Hướng dẫn



## Các dự án mẫu SubQuery

| Ví dụ                                                                                         | Miêu tả                                                                                                                              | Chủ đề                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [extrinsic-finalized-block](https://github.com/subquery/tutorials-extrinsic-finalised-blocks) | Lập chỉ mục ngoại vi để chúng có thể được truy vấn bằng hàm băm của chúng                                                            | Ví dụ đơn giản nhất với hàm __block handler__                                                                                                    |
| [block-timestamp](https://github.com/subquery/tutorials-block-timestamp)                      | Dấu thời gian lập chỉ mục của mỗi khối đã hoàn thành                                                                                 | Một ví dụ đơn giản khác về function __call handler__ (xử lý lệnh gọi)                                                                            |
| [validator-threshold](https://github.com/subquery/tutorials-validator-threshold)              | Lập Index về mức staking tối thiểu để người xác nhận đủ điều kiện để được bầu chọn.                                                  | Một ví dụ phức tạp hơn về function __block handler__ có tác dụng tạo __lệnh gọi bên ngoài__ tới cho `@polkadot/api` để lấy thêm dữ liệu on-chain |
| [sum-reward](https://github.com/subquery/tutorials-sum-reward)                                | Lập Index về số tiền ràng buộc để staking, phần thưởng staking và khoản phạt (slash) từ các sự kiện của block đã hoàn thiện          | Function __event handlers__ phức tạp hơn với quan hệ __one-to-many__                                                                             |
| [entity-relation](https://github.com/subquery/tutorials-entity-relations)                     | Lập Index về việc chuyển số dư giữa các tài khoản và cũng lập chỉ mục lô tiện ích, nhằm tìm hiểu nội dung của các lệnh gọi bên ngoài | Mối quan hệ __One-to-many__ và __many-to-many__ cùng với function __extrinsic handling__                                                         |
| [kitty](https://github.com/subquery/tutorials-kitty-chain)                                    | Lập Index thông tin ra đời của các kitty.                                                                                            | Function phức tạp để __call handlers__ và __event handlers__, với dữ liệu được lập Index từ __custom chain__                                     |
