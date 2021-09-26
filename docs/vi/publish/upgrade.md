# Triển Khai Phiên Bản Mới cho Dự Án SubQuery của bạn

## Hướng Dẫn

Mặc dù bạn có quyền luôn nâng cấp và triển khai các phiên bản mới của dự án SubQuery của mình, nhưng hãy lưu ý trong quá trình này nếu dự án SubQuery của bạn là công khai với toàn thế giới. Một số điểm chính cần lưu ý:
- Nếu nâng cấp của bạn là một thay đổi mang tính đột phá, hãy tạo một dự án mới (ví dụ `Dự Án SubQuery V2 Của Tôi`) hoặc đưa ra nhiều cảnh báo đến cộng đồng về sự thay đổi này thông qua các kênh mạng xã hội.
- Việc triển khai phiên bản dự án SubQuery mới có thể dẫn đến thời gian chết vì phiên bản mới lập chỉ mục chuỗi hoàn chỉnh từ khối genesis.

## Các Thay Đổi Triển Khai

Đăng nhập vào SubQuery Project và chọn dự án bạn muốn triển khai phiên bản mới. Bạn có thể chọn triển khai cho vùng sản xuất hoặc vùng dàn dựng. Hai khe này là môi trường biệt lập và mỗi khe có cơ sở dữ liệu riêng và đồng bộ hóa độc lập.

Chúng tôi khuyên bạn chỉ nên triển khai vào vùng phân đoạn của mình để kiểm tra giai đoạn cuối cùng hoặc khi bạn cần đồng bộ lại dữ liệu dự án của mình. Sau đó, bạn có thể quảng bá nó lên sản xuất mà không mất thời gian chết. Bạn sẽ thấy kiểm tra nhanh hơn khi [ chạy một dự án cục bộ ](../run/run.md) vì bạn có thể [ dễ dàng gỡ lỗi các sự cố ](../tutorials_examples/debug-projects.md).

Khe cắm dàn là hoàn hảo cho:
* Xác thực các thay đổi đối với Dự án SubQuery của bạn trong một môi trường riêng biệt. Vị trí dàn dựng có một URL khác để sản xuất mà bạn có thể sử dụng trong dApps của mình.
* Khởi động và lập chỉ mục dữ liệu cho một dự án SubQuery được cập nhật để loại bỏ thời gian chết trong dApp của bạn
* Chuẩn bị một bản phát hành mới cho Dự án SubQuery của bạn mà không công khai nó. Vị trí tổ chức không được hiển thị công khai trong Explorer và có một URL duy nhất chỉ hiển thị cho bạn.

![Vị trí dàn dựng](/assets/img/staging_slot.png)

#### Nâng cấp lên Dịch Vụ Query và Trình Lập Chỉ Mục Mới Nhất

Nếu bạn muốn nâng cấp lên trình lập chỉ mục mới nhất ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) hoặc dịch vụ query ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) để có lợi thế về khả năng cải thiện độ ổn định và hiệu năng thông thường của chúng tôi. Chỉ cần chọn ra các phiên bản mới hơn trong các gói của chúng tôi và lưu. Bước này sẽ chỉ tốn vài phút.

#### Triển Khai Phiên Bản Mới Dự Án SubQuery của bạn

Điền vào Commit Hash từ GitHub (sao chép toàn bộ commit hash) của phiên bản codebase dự án SubQuery mà bạn muốn triển khai. Bước này sẽ làm tốn nhiều thời gian hơn nữa tùy thuộc vào thời gian cần để lập chỉ mục chuỗi hiện tại. Bạn luôn có thể báo cáo tiến độ lại tại đây.

## Các Bước Tiếp Theo - Kết nối đến Dự Án của bạn
Sau khi quá trình triển khai hoàn tất thành công và các node đã lập chỉ mục dữ liệu của bạn từ chuỗi, bạn có thể kết nối đến dự án của mình thông qua endpoint GraphQL Query được hiển thị.

![Dự án đang được triển khai và đồng bộ hóa](/assets/img/projects-deploy-sync.png)

Bạn cũng có thể nhấp vào ba dấu chấm bên cạnh tiêu đề dự án của mình, và xem nó trên SubQuery Explorer. Tại đó bạn có thể sử dụng nền tảng trong trình duyệt để bắt đầu - [đọc thêm về cách thức sử dụng Explorer của chúng tôi tại đây](../query/query.md).
