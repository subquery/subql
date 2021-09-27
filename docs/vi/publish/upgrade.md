# Triển Khai Phiên Bản Mới cho Dự Án SubQuery của bạn

## Hướng Dẫn

Mặc dù bạn được tự do để luôn nâng cấp và triển khai các phiên bản mới cho dự án SubQuery của mình, vui lòng cân nhắc trong suốt quá trình này nếu dự án SubQuery của bạn đang công khai với thế giới. Một vài điểm quan trọng cần lưu ý:

- Nếu nâng cấp của bạn là một thay đổi mang tính đột phá, hãy tạo một dự án mới (ví dụ `Dự Án SubQuery V2 Của Tôi`) hoặc đưa ra nhiều cảnh báo đến cộng đồng về sự thay đổi này thông qua các kênh mạng xã hội.
- Việc triển khai phiên bản dự án SubQuery mới có thể dẫn đến thời gian chết vì phiên bản mới lập chỉ mục chuỗi hoàn chỉnh từ khối genesis.

## Các Thay Đổi Triển Khai

Đăng nhập vào Các Dự Án SubQuery, và tìm dự án mà bạn muốn triển khai phiên bản mới. Dưới Phần Thông Tin Triển Khai bạn sẽ thấy ba dấu chấm trên cùng bên phải, nhấp vào nút Deploy New Version.

![Triển khai phiên bản mới đến Dự Án của bạn](https://static.subquery.network/media/projects/projects-second-deploy.png)

#### Nâng cấp lên Dịch Vụ Query và Trình Lập Chỉ Mục Mới Nhất

Nếu bạn muốn nâng cấp lên trình lập chỉ mục mới nhất ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) hoặc dịch vụ query ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) để có lợi thế về khả năng cải thiện độ ổn định và hiệu năng thông thường của chúng tôi. Chỉ cần chọn ra các phiên bản mới hơn trong các gói của chúng tôi và lưu. Bước này sẽ chỉ tốn vài phút.

#### Triển Khai Phiên Bản Mới Dự Án SubQuery của bạn

Điền vào Commit Hash từ GitHub (sao chép toàn bộ commit hash) của phiên bản codebase dự án SubQuery mà bạn muốn triển khai. Bước này sẽ làm tốn nhiều thời gian hơn nữa tùy thuộc vào thời gian cần để lập chỉ mục chuỗi hiện tại. Bạn luôn có thể báo cáo tiến độ lại tại đây.

## Các Bước Tiếp Theo - Kết nối đến Dự Án của bạn

Sau khi quá trình triển khai hoàn tất thành công và các node đã lập chỉ mục dữ liệu của bạn từ chuỗi, bạn có thể kết nối đến dự án của mình thông qua endpoint GraphQL Query được hiển thị.

![Dự án đang được triển khai và đồng bộ](https://static.subquery.network/media/projects/projects-deploy-sync.png)

Bạn cũng có thể nhấp vào ba dấu chấm bên cạnh tiêu đề dự án của mình, và xem nó trên SubQuery Explorer. Tại đó bạn có thể sử dụng nền tảng trong trình duyệt để bắt đầu - [đọc thêm về cách thức sử dụng Explorer của chúng tôi tại đây](../query/query.md).
