# Terminology

- Dự án SubQuery (*nơi phép màu nảy sinh*): Định nghĩa ([`@subql/cli`](https://www.npmjs.com/package/@subql/cli)) về cách SubQuery Node sẽ đi qua và tổng hợp một mạng dự án, về cách dữ liệu sẽ được chuyển đổi và lưu trữ để kích hoạt các truy vấn GraphQL hữu ích
- SubQuery Node (*nơi công việc được hoàn thành*): package này ([`@subql/node`](https://www.npmjs.com/package/@subql/node)) sẽ chấp nhận định nghĩa của dự án SubQuery và chạy một node có tác dụng liên tục lập Index cho mạng được kết nối gắn với một cơ sở dữ liệu
- Dịch vụ truy vấn SubQuery (*nơi để lấy dữ liệu*): Package này ([`@subql/query`](https://www.npmjs.com/package/@subql/query)) tương tác với API GraphQL của một Node SubQuery đã được triển khai để truy vấn và xem dữ liệu được lập Index
- GraphQL (*cách để truy vấn dữ liệu*): Đây là một ngôn ngữ truy vấn dành cho các API, đặc biệt phù hợp với dữ liệu dựa trên biểu đồ linh hoạt - xem [graphql.org](https://graphql.org/learn/)