# Làm thế nào để gỡ lỗi một dự án SubQuery?

## Video hướng dẫn

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## Giới thiệu

Để gỡ lỗi các dự án SubQuery, chẳng hạn như thong qua mã, đặt điểm ngắt và kiểm tra các biến, bạn sẽ phải sử dụng trình kiểm tra Node.js kết hợp với các công cụ dành cho nhà phát triển Chrome.

## Node inspector

Chạy lệnh sau trong màn hình đầu cuối.

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

Ví dụ:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```

## Chrome devtools

Open up Chrome DevTools and navigate to the Sources tab. Note that clicking on the green icon will open up a new window.

![node inspect](/assets/img/node_inspect.png)

Navigate to Filesystem and add your project folder to the workspace. Then open the dist > mappings folder and select the code you wish to debug. Then step through the code as with any standard debugging tool.

![debugging projects](/assets/img/debugging_projects.png)
