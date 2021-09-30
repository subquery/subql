# คำถามที่พบบ่อย

## SubQuery คืออะไร?

SubQuery เป็นโครงการโอเพ่นซอร์สที่ช่วยให้นักพัฒนาสามารถทำการ index เปลี่ยนแปลง และสืบค้นข้อมูลเชนของ Substrate เพื่อขับเคลื่อนแอปพลิเคชันของตนได้

SubQuery ยังให้บริการโฮสติ้งโปรเจ็กต์ระดับโปรดักชันฟรีสำหรับนักพัฒนา เพื่อลดความรับผิดชอบในการจัดการโครงสร้างพื้นฐาน และปล่อยให้นักพัฒนาได้ทำในสิ่งที่พวกเขาทำได้ดีที่สุด - นั่นคือ การสร้าง

## วิธีที่ดีที่สุดในการเริ่มต้นใช้งาน SubQuery คืออะไร?

วิธีที่ดีที่สุดในการเริ่มต้นใช้งาน SubQuery คือลองใช้ [บทแนะนำ Hello World](../quickstart/helloworld-localhost.md) ของเรา นี่คือขั้นตอนง่ายๆ ในการดาวน์โหลดเทมเพลตเริ่มต้น สร้างโครงการ จากนั้นใช้ Docker เพื่อเรียกใช้โหนดบน localhost ของคุณและรัน query อย่างง่าย

## ฉันจะมีส่วนร่วมหรือให้คำติชมกับ SubQuery ได้อย่างไร?

เรารักการมีส่วนร่วมและข้อเสนอแนะจากชุมชน ในการสนับสนุนโค้ด ให้ fork repository ที่สนใจ และทำการเปลี่ยนแปลง จากนั้นส่ง PR หรือ Pull Request อ้อ อย่าลืมทดสอบด้วยล่ะ! รวมถึงตรวจสอบหลักเกณฑ์การสนับสนุน (TBA) ของเราด้วย

หากต้องการแสดงความคิดเห็น โปรดติดต่อเราที่ hello@subquery.network หรือไปที่ [ช่อง discord](https://discord.com/invite/78zg8aBSMG)

## การโฮสต์โครงการของฉันในโครงการ SubQuery มีค่าใช้จ่ายเท่าใด?

การโฮสต์โครงการของคุณในโครงการ SubQuery นั้นฟรี - นั่นเป็นวิธีการตอบแทนชุมชนของเรา หากต้องการเรียนรู้วิธีโฮสต์โครงการของคุณกับเรา โปรดดูบทแนะนำ [Hello World (SubQuery hosted)](../quickstart/helloworld-hosted.md)

## Deployment slots คืออะไร?

Deployment slots เป็นฟีเจอร์ใน [โครงการ SubQuery](https://project.subquery.network) ซึ่งเทียบเท่ากับสภาพแวดล้อมสำหรับการพัฒนา ตัวอย่างเช่น ในองค์กรซอฟต์แวร์ใดๆ โดยปกติจะมีสภาพแวดล้อมสำหรับการพัฒนาและสภาพแวดล้อมสำหรับการผลิตเป็นขั้นต่ำ (ไม่นับรวม localhost) โดยทั่วไปแล้วอาจจะมีสภาพแวดล้อมอื่นๆเพิ่มเติม เช่น การจัดเตรียมและก่อนการผลิต หรือแม้กระทั่ง QA จะรวมอยู่ด้วย ขึ้นอยู่กับความต้องการขององค์กรและการตั้งค่ากระบวนการการพัฒนา

SubQuery ปัจจุบันมีสอง slot ที่พร้อมใช้งาน คือ slot สำหรับ staging และ production ซึ่งช่วยให้นักพัฒนา deploy SubQuery ของตนกับ staging environment และเมื่อทุกอย่างเป็นไปด้วยดี ก็สามารถ"โปรโมตเป็น production" ได้เพียงคลิกปุ่ม

## ข้อดีของ staging slot คืออะไร?

ประโยชน์หลักของการใช้ staging slot คือช่วยให้คุณสามารถเตรียม new release ของโปรเจ็กต์ SubQuery โดยยังไม่ต้องเปิดเผยต่อสาธารณะ คุณสามารถรอให้ staging slot ทำการ index ข้อมูลทั้งหมดใหม่โดยไม่กระทบต่อแอปพลิเคชันที่ใช้งานจริงของคุณ

Staging slot จะไม่แสดงต่อสาธารณะใน [Explorer](https://explorer.subquery.network/) และมี URL เฉพาะที่มองเห็นได้เฉพาะคุณเท่านั้น And of course, the separate environment allows you to test your new code without affecting production.

## What are extrinsics?

If you are already familiar with blockchain concepts, you can think of extrinsics as comparable to transactions. More formally though, an extrinsic is a piece of information that comes from outside the chain and is included in a block. There are three categories of extrinsics. They are inherents, signed transactions, and unsigned transactions.

Inherent extrinsics are pieces of information that are not signed and only inserted into a block by the block author.

Signed transaction extrinsics are transactions that contain a signature of the account that issued the transaction. They stands to pay a fee to have the transaction included on chain.

Unsigned transactions extrinsics are transactions that do not contain a signature of the account that issued the transaction. Unsigned transactions extrinsics should be used with care because there is nobody paying a fee, becaused it is signed. Because of this, the transaction queue lacks economic logic to prevent spam.

For more information, click [here](https://substrate.dev/docs/en/knowledgebase/learn-substrate/extrinsics).

## What is the endpoint for the Kusama network?

The network.endpoint for the Kusama network is `wss://kusama.api.onfinality.io/public-ws`.

## What is the endpoint for the Polkadot mainnet network?

The network.endpoint for the Polkadot network is `wss://polkadot.api.onfinality.io/public-ws`.
