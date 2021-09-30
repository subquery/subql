# จะ debug โปรเจ็กต์ SubQuery ได้อย่างไร?

## คู่มือวิดีโอ

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/6NlaO-YN2q4" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## บทนำ

ในการ debug โปรเจ็กต์ SubQuery เช่น การข้ามไปยังบรรทัดโค้ดที่ต้องการ การตั้งค่า breakpoints และการตรวจสอบตัวแปร คุณจะต้องใช้ inspector ของ Node.js ร่วมกับ Chrome developer tools

## Node inspector

เรียกใช้คำสั่งต่อไปนี้ในหน้าจอเทอร์มินัล

```shell
node --inspect-brk <path to subql-node> -f <path to subQuery project>
```

ตัวอย่าง:
```shell
node --inspect-brk /usr/local/bin/subql-node -f ~/Code/subQuery/projects/subql-helloworld/
Debugger listening on ws://127.0.0.1:9229/56156753-c07d-4bbe-af2d-2c7ff4bcc5ad
For help, see: https://nodejs.org/en/docs/inspector
Debugger attached.
```

## Chrome devtools

เปิด Chrome DevTools และไปที่แท็บ Sources โปรดทราบว่าการคลิกที่ไอคอนสีเขียวจะเป็นการเปิดหน้าต่างใหม่

![node inspect](/assets/img/node_inspect.png)

ไปที่ Filesystem และเพิ่มโฟลเดอร์โปรเจ็กต์ของคุณไป workspace จากนั้นเปิด dist > โฟลเดอร์ mappings และเลือกโค้ดคุณต้องการ debug จากนั้นตรวจสอบโค้ดเช่นเดียวกับเครื่องมือสำหรับ debug มาตรฐานทั่วไป

![การ debug projects](/assets/img/debugging_projects.png)
