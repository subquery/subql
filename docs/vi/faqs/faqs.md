# Các câu hỏi thường gặp

## SubQuery là gì?

SubQuery là một dự án mã nguồn mở cho phép các nhà phát triển chạy trình lập chỉ mục, chuyển đổi và truy vấn dữ liệu trên chuỗi Substrate để chạy các ứng dụng của họ.

SubQuery cũng cung cấp dịch vụ lưu trữ miễn phí, công suất lớn cho các dự án của các nhà phát triển; trút bỏ trách nhiệm của các nhà sản xuất trong việc quản lý cơ sở hạ tầng nữa, để họ tập trung làm việc mình giỏi nhất: lập trình.

## Cách tốt nhất để bắt đầu sử dụng SubQuery là gì?

Cách tốt nhất để bắt đầu sử dụng SubQuery là thực hiện [Hướng dẫn Hello World](../quickstart/helloworld-localhost.md) của chúng tôi. Đây là một hướng dẫn 5 phút đơn giản để tải xuống mẫu khởi động, xây dựng dự án và sau đó sử dụng Docker để chạy một nút trên máy chủ cục bộ của bạn và chạy một truy vấn đơn giản.

## Làm cách nào để tôi có thể đóng góp hoặc gửi phản hồi cho SubQuery?

Chúng tôi rất trân trọng những đóng góp và phản hồi từ cộng đồng. Để đóng góp mã, hãy chia nhỏ kho lưu trữ quan tâm và thực hiện các thay đổi của bạn. Sau đó gửi PR hoặc Pull Request. Ồ, đừng quên kiểm tra lại nhé! Bạn nên tham khảo hướng dẫn đóng góp của chúng tôi (TBA/thông báo sau).

Để gửi phản hồi, hãy liên hệ với chúng tôi qua email hello@subquery.network hoặc truy cập [kênh discord](https://discord.com/invite/78zg8aBSMG) của chúng tôi

## Chi phí để lưu trữ dự án của tôi trong SubQuery Projects là bao nhiêu?

Bạn có thể lưu trữ dự án trong SubQuery Projects hoàn toàn miễn phí - đó là cách chúng tôi đóng góp cho cộng đồng. Để tìm hiểu cách lưu trữ dự án của bạn với chúng tôi, vui lòng xem hướng dẫn [Hello World (SubQuery hosted)](../quickstart/helloworld-hosted.md).

## Các vị trí triển khai là gì?

Vị trí triển khai là một tính năng trong [SubQuery Projects](https://project.subquery.network) gần giống với môi trường phát triển. Ví dụ, trong bất kỳ tổ chức phần mềm nào tối thiểu đều có môi trường phát triển và môi trường sản xuất (không tính localhost). Thông thường, nó bao gồm các môi trường bổ sung như staging (dàn dựng) và pre-pod (tiền sản xuất) hoặc thậm chí là QA, tùy thuộc vào nhu cầu của tổ chức và sự phát triển của chúng được thiết lập.

SubQuery hiện có sẵn hai vị trí. Một vị trí dàn dựng (staging slot) và một vị trí sản xuất (production slot). Điều này cho phép các nhà phát triển triển khai SubQuery của họ vào môi trường dàn dựng và để mọi thứ diễn ra tốt đẹp, sau đó chọn "thúc đẩy sản xuất" chỉ bằng một nút bấm.

## Ưu điểm của vị trí dàn dựng là gì?

Lợi ích chính của việc sử dụng vị trí dàn dựng là nó cho phép bạn chuẩn bị một bản phát hành mới cho dự án SubQuery của mình không cần công khai. Bạn có thể đợi vị trí dàn dựng lập chỉ mục lại tất cả dữ liệu mà không ảnh hưởng đến các ứng dụng sản xuất của bạn.

Vị trí dàn dựng không được hiển thị công khai trong [ Explorer ](https://explorer.subquery.network/) và có một URL duy nhất chỉ hiển thị cho bạn. Và tất nhiên, môi trường riêng biệt này cho phép bạn kiểm tra mã mới của mình mà không ảnh hưởng đến quá trình sản xuất.

## Thông tin ngoại lai (extrinsics) là gì?

Nếu bạn đã quen thuộc với các khái niệm blockchain, bạn có thể nghĩ thông tin ngoại lai gần giống với các giao dịch. Tuy nhiên, về mặt chính thức, thông tin ngoại lai là một đoạn thông tin đến từ bên ngoài chuỗi và được bao gồm trong một block. Có ba loại thông tin ngoại lai. Bao gồm: thông tin cố hữu, giao dịch đã ký và giao dịch chưa ký.

Thông tin ngoại lai cố hữu là những phần thông tin không được ký và chỉ được thêm vào block bởi tác giả của block.

Giao dịch ngoại lai có chữ ký là các giao dịch có chứa chữ ký của tài khoản thực hiện giao dịch. Họ phải trả một khoản phí để giao dịch được đưa vào chuỗi.

Các giao dịch ngoại lai không có chữ ký là các giao dịch không có chữ ký của tài khoản đã thực hiện giao dịch. Các giao dịch ngoại lai chưa được ký kết nên sử dụng cẩn thận vì không ai trả phí, vì nó đã được ký. Vì thế, danh sách chờ giao dịch không có logic kinh tế để tránh bị spam.

Để biết thêm thông tin chi tiết, hãy nhấp vào [đây](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).
