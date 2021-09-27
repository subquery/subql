# Từ điển SubQuery hoạt động như thế nào?

Toàn bộ ý tưởng của một dự án từ điển chung là lập chỉ mục tất cả dữ liệu từ một chuỗi khối và ghi lại các sự kiện, ngoại diên và các loại của nó (mô-đun và phương pháp) trong cơ sở dữ liệu theo thứ tự chiều cao của khối. Sau đó, một dự án khác có thể truy vấn điểm cuối ` network.dictionary ` này thay vì ` network.endpoint ` mặc định được xác định trong tệp kê khai.

Điểm cuối ` network.dictionary ` là một tham số tùy chọn mà nếu có, SDK sẽ tự động phát hiện và sử dụng. ` network.endpoint ` là bắt buộc và sẽ không biên dịch nếu không có.

Lấy dự án [ từ điển SubQuery ](https://github.com/subquery/subql-dictionary) làm ví dụ, tệp [ schema ](https://github.com/subquery/subql-dictionary/blob/main/schema.graphql) xác định 3 thực thể; bên ngoài, sự kiện, specVersion. 3 thực thể này lần lượt chứa 6, 4 và 2 trường. Khi dự án này được chạy, các trường này được phản ánh trong các bảng cơ sở dữ liệu.

![extrinsics table](/assets/img/extrinsics_table.png) ![events table](/assets/img/events_table.png) ![specversion table](/assets/img/specversion_table.png)

Dữ liệu từ blockchain sau đó được lưu trữ trong các bảng này và được lập chỉ mục cho hiệu suất. Sau đó, dự án được lưu trữ trong Dự án SubQuery và điểm cuối API có sẵn để được thêm vào tệp kê khai.

## Làm thế nào để kết hợp một từ điển vào dự án của bạn?

Thêm `dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot` vào phần mạng của tệp kê khai. Ví dụ:

```shell
network:
  endpoint: wss://polkadot.api.onfinality.io/public-ws
  dictionary: https://api.subquery.network/sq/subquery/dictionary-polkadot
```

## Điều gì xảy ra khi từ điển KHÔNG được sử dụng?

Khi KHÔNG sử dụng từ điển, trình lập chỉ mục sẽ tìm nạp mọi dữ liệu khối thông qua api polkadot theo cờ `batch-size` là 100 theo mặc định và đặt nó vào bộ đệm để xử lý. Sau đó, trình lập chỉ mục lấy tất cả các khối này từ bộ đệm và trong khi xử lý dữ liệu khối, kiểm tra xem sự kiện và nội tại trong các khối này có khớp với bộ lọc do người dùng xác định hay không.

## Điều gì xảy ra khi sử dụng từ điển?

Khi từ điển được sử dụng, trình lập chỉ mục trước tiên sẽ lấy bộ lọc cuộc gọi và sự kiện làm tham số và hợp nhất nó thành một truy vấn GraphQL. Sau đó, nó sử dụng API của từ điển để lấy danh sách các chiều cao khối có liên quan chỉ chứa các sự kiện và ngoại diên cụ thể. Thường thì giá trị này về cơ bản nhỏ hơn 100 nếu sử dụng mặc định.

Ví dụ: hãy tưởng tượng một tình huống mà bạn đang lập chỉ mục các sự kiện chuyển giao. Không phải tất cả các khối đều có sự kiện này (trong hình bên dưới không có sự kiện chuyển giao ở khối 3 và 4).

![dictionary block](/assets/img/dictionary_blocks.png)

Từ điển cho phép dự án của bạn bỏ qua điều này, vì vậy thay vì tìm kiếm từng khối để tìm sự kiện chuyển giao, nó sẽ bỏ qua chỉ các khối 1, 2 và 5. Điều này là do từ điển là một tham chiếu được tính toán trước cho tất cả các cuộc gọi và sự kiện trong mỗi khối.

Điều này có nghĩa là việc sử dụng từ điển có thể giảm lượng dữ liệu mà trình lập chỉ mục thu được từ chuỗi và giảm số lượng khối "không mong muốn" được lưu trữ trong bộ đệm cục bộ. Nhưng so với phương pháp truyền thống, phương pháp này bổ sung thêm một bước để lấy dữ liệu từ API của từ điển.

## Khi nào một từ điển KHÔNG hữu ích?

Khi [block handlers](https://doc.subquery.network/create/mapping.html#block-handler) được sử dụng để lấy dữ liệu từ một chuỗi, mọi khối cần được xử lý. Do đó, việc sử dụng từ điển trong trường hợp này không mang lại bất kỳ lợi thế nào và trình lập chỉ mục sẽ tự động chuyển sang cách tiếp cận không dùng từ điển mặc định.

Ngoài ra, khi xử lý các sự kiện hoặc nội tại xảy ra hoặc tồn tại trong mọi khối như ` timestamp.set `, việc sử dụng từ điển sẽ không mang lại bất kỳ lợi thế nào.
