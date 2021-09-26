# Xuất bản Dự Án SubQuery của bạn

## Các lợi ích của việc hosting dự án của bạn bằng SubQuery
- Chúng tôi sẽ chạy các dự án SubQuery của bạn trong một dịch vụ công được quản lý có hiệu suất cao, có thể mở rộng
- Dịch vụ này đang được cung cấp đến cộng đồng miễn phí!
- Bạn có thể tạo ra các dự án công khai do đó chúng sẽ được liệt kê trong [SubQuery Explorer](https://explorer.subquery.network) và bất cứ ai trên khắp thế giới cũng đều có thể xem chúng
- Chúng tôi được tích hợp với GitHub, vì thế bất kỳ ai trong các tổ chức GitHub của bạn cũng sẽ xem được các dự án đã chia sẻ của tổ chức

## Tạo Dự Án Đầu Tiên

#### Đăng nhập vào Các Dự Án SubQuery

Trước khi bắt đầu, vui lòng đảm bảo rằng dự án SubQuery của bạn trực tuyến trong kho lưu trữ GitHub công khai. Tệp tin `schema.graphql` phải được nằm trong thư mục gốc của bạn.

Để tạo ra dự án đầu tiên, hãy đến [project.subquery.network](https://project.subquery.network). Bạn sẽ cần xác thực tài khoản GitHub của mình để đăng nhập.

Trong lần đăng nhập đầu tiên, bạn sẽ được yêu cầu cấp quyền cho SubQuery. Chúng tôi chỉ cần địa chỉ email của bạn để định dạnh tài khoản của bạn, và chúng tôi không sử dụng bất kỳ dữ liệu nào từ tài khoản GitHub của bạn vì bất kỳ lý do gì. Trong bước này, bạn cũng có thể yêu cầu cấp quyền truy cập đến tài khoản GitHub Organization của bạn để đăng các dự án SubQuery dưới GitHub Organization của mình thay vì tài khoản cá nhân.

![Thu hồi chấp thuận từ một tài khoản GitHub](/assets/img/project_auth_request.png)

SubQuery Projects là nơi bạn quản lý tất cả các dự án của bạn đã được tải lên nền tảng SubQuery. Bạn có thể tạo, xóa, và thậm chí nâng cấp các dự án từ ứng dụng này.

![Đăng Nhập Các Dự Án](/assets/img/projects-dashboard.png)

Nếu bạn có kết nối các tài khoản GitHub Organization, bạn có thể sử dụng tính năng chuyển đổi ở đầu trang để thay đổi giữa tài khoản cá nhân và tài khoản GitHub Organization. Các dự án được tạo ra trong tài khoản GitHub Organization đều được chia sẻ giữa các thành viên trong GitHub Organization đó. Để kết nối tài khoản GitHub Organization của bạn, bạn có thể [làm theo các bước tại đây](#add-github-organization-account-to-subquery-projects).

![Chuyển đổi giữa các tài khoản GitHub](/assets/img/projects-account-switcher.png)

#### Tạo Dữ Án Đầu Tiên của bạn

Chúng ta hãy bắt đầu bằng cách nhấp vào "Create Project". Bạn sẽ được đưa đến biểu mẫu Dự Án Mới. Vui lòng nhập vào những thứ sau đây (bạn có thể thay đổi trong tương lai):
- **Tài khoản GitHub:** Nếu bạn có nhiều hơn một tài khoản GitHub, hãy chọn ra tài khoản mà dự án này được tạo ra bên dưới. Các dự án được tạo ra trong tài khoản GitHub Organization đều được chia sẻ giữa các thành viên trong cùng tổ chức.
- **Tên**
- **Phụ đề**
- **Mô tả**
- **URL Kho Lưu Trữ GitHub:** Đây phải là một URL GitHub hợp lệ chỉ đến kho lưu trữ công khai có chứa dự án SubQuery của bạn. Tập tin `schema.graphql` phải nằm trong thư mục gốc của bạn ([tìm hiểu thêm về cấu trúc thư mục gốc](../create/introduction.md#directory-structure)).
- **Ẩn dự án:** Nếu được chọn, tính năng này sẽ ẩn dự án khỏi SubQuery Explorer công khai. Bỏ trống không chọn nếu bạn muốn chia sẻ SubQuery của mình với cộng đồng! ![Tạo Dự Án đầu tiên của bạn](/assets/img/projects-create.png)

Hãy tạo dự án cho riêng mình và bạn sẽ thấy nó trong danh sách Các Dự Án SubQuery của bạn. *Chúng ta sắp xong rồi! Chúng tôi chỉ cần triển khai một phiên bản mới của nó. </em>

![Dự Án Đã Tạo mà chưa triển khai](/assets/img/projects-no-deployment.png)

#### Thực thi Phiên Bản đầu tiên của bạn

Trong khi đang khởi tạo, dự án sẽ thiết lập hành vi hiển thị của nó, bạn phải triển khai một phiên bản của nó trước khi dự án đi vào vận hành. Triển khai một phiên bản sẽ kích hoạt khởi động lập chỉ mục SubQuery mới để bắt đầu, và cài đặt dịch vụ query bắt buộc để chấp nhận các yêu cầu từ GraphQl. Bạn cũng có thể triển khai các phiên bản mới đối với các dự án hiện tại tại đây.

Cùng với dự án mới của mình, bạn sẽ thấy một nút bấm Deploy New Version. Nhấp vào nút này, và điền vào các thông tin bắt buộc để thực hiện triển khai:
- **Commit Hash của Phiên Bản mới:** Từ GitHub, sao chép commit hash của phiên bản codebase dự án SubQuery mà bạn muốn triển khai
- **Phiên Bản Indexer:** Đây là phiên bản dịch vụ node của SubQuery mà bạn muốn chạy SubQuery này trên đó. Xem [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Phiên Bản Query:** Đây là phiên bản dịch vụ query của SubQuery mà bạn muốn chạy SubQuery này trên đó. Xem [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Triển khai Dự Án đầu tiên của bạn](https://static.subquery.network/media/projects/projects-first-deployment.png)

Nếu được triển khai thành công, bạn sẽ thấy indexer bắt đầu hoạt động và báo cáo về tiến độ lập chỉ mục cho chuỗi hiện tại. Tiến trình này có thể mất nhiều thời gian cho tới khi nó đạt đến 100%.

## Các Bước Tiếp Theo - Kết nối đến Dự Án của bạn
Sau khi việc triển khai đã thành công và các node đã lập chỉ mục dữ liệu của bạn trên chuỗi, bạn sẽ có thể kết nối với dự án của mình thông qua endpoint được hiển thị của GraphQL Query.

![Dự án đang được triển khai và đồng bộ](/assets/img/projects-deploy-sync.png)

Bạn cũng có thể nhấp vào ba dấu chấm bên cạnh đề mục dự án của mình, và xem nó trong SubQuery Explorer. Tại đó bạn có thể sử dụng nền tảng trong trình duyệt để tiến hành - [tìm hiểu nhiều hơn về cách sử dụng Explorer của chúng tôi tại đây](../query/query.md).

![Các dự án trong SubQuery Explorer](/assets/img/projects-explorer.png)

## Thêm Tài Khoản GitHub Organization vào các Dự Án SubQuery

Xuất bản dự án SubQuery dưới tên tài khoản GitHub Organization của bạn thay vì dùng tài khoản GitHub cá nhân là điều phổ biến. Bạn có thể thay đổi tài khoản hiện đang chọn trên [SubQuery Projects](https://project.subquery.network) bất cứ lúc nào bằng cách sử dụng tính năng chuyển đổi tài khoản.

![Chuyển đổi giữa các tài khoản GitHub](/assets/img/projects-account-switcher.png)

Nếu bạn không thể nhìn thấy tài khoản GitHub Organization của mình được liệt kê trong phần chuyển đổi tài khoản, bạn có thể cần phải cấp quyền truy cập vào SubQuery đối với GitHub Organization của bạn (hoặc yêu cầu quyền này từ một quản trị viên). Để thực hiện việc này, trước tiên bạn cần thu hồi quyền từ tài khoản GitHub của mình đối với Ứng dụng SubQuery. Để thực hiện việc này, hãy đăng nhập vào phần cài đặt tài khoản của bạn trong GitHub, đến Applications, và bên dưới thẻ Authorized Oauth Apps, thu hồi SubQuery - [ bạn có thể làm theo các bước chính xác tại đây ](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Đừng lo, việc này sẽ không xóa đi dự án SubQuery của bạn và bạn sẽ không bị mất bất kỳ dữ liệu nào.**

![Thu hồi truy cập đối với tài khoản GitHub](/assets/img/project_auth_revoke.png)

Sau khi bạn đã thu hồi quyền truy cập, hãy đăng xuất ra khỏi [SubQuery Projects](https://project.subquery.network) và đăng nhập vào lại. Bạn sẽ được đưa đến một trang có tiêu đề *Authorize SubQuery* đây là trang bạn có thể yêu cầu cấp quyền truy cập SubQuerry đến tài khoản GitHub Organization của bạn. Nếu bạn không có các quyền quản trị, bạn cần phải yêu cầu một quản trị quyên cấp các quyền này cho bạn.

![Thu hồi chấp thuận từ một tài khoản GitHub](/assets/img/project_auth_request.png)

Sau khi yêu cầu đã được chấp thuận bởi quản trị viên (hoặc nếu bạn có thể tự cấp quyền cho mình), bạn sẽ thấy tài khoản GitHub Organization chính xác trong khu vực chuyển đổi tài khoản.