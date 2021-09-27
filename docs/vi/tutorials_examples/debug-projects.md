# Làm thế nào để gỡ lỗi một dự án SubQuery?

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giới thiệu

Để gỡ lỗi các dự án SubQuery, chẳng hạn như bước qua mã, đặt điểm ngắt và kiểm tra các biến, bạn sẽ phải sử dụng trình kiểm tra Node.js kết hợp với các công cụ dành cho nhà phát triển Chrome.

## Node inspector

Chạy lệnh sau trong màn hình đầu cuối.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Ví dụ:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Đang nghe trình gỡ lỗi ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
Để được trợ giúp, hãy xem: https://nodejs.org/en/docs/ins Inspector
Đã đính kèm trình gỡ lỗi.
```

## Chrome devtools

Mở Chrome DevTools và điều hướng đến tab Sources. Lưu ý rằng nhấp vào biểu tượng màu xanh lá cây sẽ mở ra một cửa sổ mới.

![node inspect](/assets/img/node_inspect.png)

Điều hướng đến Filesystem và thêm thư mục dự án của bạn vào không gian làm việc. Sau đó, mở dist > thư mục ánh xạ và chọn mã bạn muốn gỡ lỗi. Sau đó, bước qua mã như với bất kỳ công cụ gỡ lỗi tiêu chuẩn nào.

![debugging projects](/assets/img/debugging_projects.png)
