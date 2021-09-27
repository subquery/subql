# Sandbox

Theo hình dung của chúng tôi về cách sử dụng, node SubQuery thường được chạy trên một máy chủ đáng tin cậy, còn mã nguồn của dự án SubQuery do người dùng gửi đến node thì lại không thể tin cậy tuyệt đối.

Một số mã độc có khả năng tấn công hoặc thậm chí xâm phạm máy chủ và gây tổn hại tới dữ liệu của các dự án khác trong cùng máy chủ đó. Do đó, chúng tôi sử dụng cơ chế bảo mật sandbox [VM2](https://www.npmjs.com/package/vm2) để giảm thiểu rủi ro. Cơ chế Sandbox này có thể:

- Khởi chạy những đoạn code có rủi ro một cách an toàn trong môi trường biệt lập, mã độc sẽ không thể truy cập vào mạng và hệ thống tệp của máy chủ lưu trữ trừ khi thông qua giao diện tiếp xúc mà chúng tôi đã đưa vào sandbox.

- Gọi các phương thức, trao đổi dữ liệu và gọi lại function giữa các sandbox một cách an toàn.

- Có khả năng miễn dịch với nhiều phương pháp tấn công đã biết.

## Hạn chế

- Để giới hạn quyền truy cập vào một số modul tích hợp sẵn, chỉ có modul `assert`, `buffer`, `crypto`,`util` và `path` mới được đưa vào danh sách trắng (whitelist).

- Chúng tôi hỗ trợ [các modul của bên thứ 3](../create/mapping.md#third-party-libraries) được viết trong các thư viện **CommonJS** và **lai (hybrid)** như `@polkadot/*` (sử dụng ESM làm mặc định).

- Bất kỳ modul nào sử dụng `HTTP` và `WebSocket` đều bị cấm.
