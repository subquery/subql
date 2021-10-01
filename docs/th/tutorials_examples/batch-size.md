# จะเปลี่ยน batch size การ fetch บล็อคเชนได้อย่างไร?

## คู่มือวิดีโอ

<figure class="video_container">
  <iframe src="https://www.youtube.com/embed/LO_Gea_IN_s" frameborder="0" allowfullscreen="true"></iframe>
</figure>

## บทนำ

batch size เริ่มต้นคือ 100 แต่สามารถเปลี่ยนแปลงได้โดยใช้คำสั่งเพิ่มเติม `--batch-size=xx`

คุณต้องใช้สิ่งนี้กับ command line ซึ่งเป็น flag เพิ่มเติม หรือหากคุณใช้ Docker ให้แก้ไขไฟล์ docker-compose.yml ด้วย:

```shell
subquery-node:
    image: onfinality/subql-node:latest
    depends_on:
      - "postgres"
    restart: always
    environment:
      DB_USER: postgres
      DB_PASS: postgres
      DB_DATABASE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
    volumes:
      - ./:/app
    command:
      - -f=/app
      - --local
      - --batch-size=50

```

ตัวอย่างนี้กำหนด batch size เป็น 50

## ทำไมต้องเปลี่ยน batch size?

การใช้ batch size ที่เล็กลงสามารถลดการใช้หน่วยความจำได้ และไม่ปล่อยให้ผู้ใช้ต้องค้างกับการสืบค้นข้อมูลจำนวนมาก กล่าวอีกนัยหนึ่งคือ แอปพลิเคชันของคุณสามารถตอบสนองได้มากขึ้น 