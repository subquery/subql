# เผยแพร่โครงการ SubQuery ของคุณ

## ประโยชน์ในการโฮสต์โปรเจ็กต์ของคุณกับ SubQuery
- เราจะรันโปรเจ็กต์ SubQuery ให้กับคุณด้วยบริการที่มีประสิทธิภาพสูง สามารถปรับขนาดได้ และมีการจัดการแบบบริการสาธารณะ
- บริการนี้มอบให้กับชุมชนฟรี!
- คุณสามารถกำหนดให้โปรเจ็กต์ของคุณเป็นแบบสาธารณะเพื่อให้ลิสต์อยู่ใน [SubQuery Explorer](https://explorer.subquery.network) และทุกคนทั่วโลกสามารถดูได้
- เราผสานรวมกับ GitHub ดังนั้นทุกคนใน GitHub organisations ของคุณจะสามารถดูโปรเจ็กต์ขององค์กรที่ใช้ร่วมกันได้

## สร้างโปรเจ็กต์แรกของคุณ

#### เข้าสู่ระบบโปรเจ็กต์ SubQuery

ก่อนเริ่มต้น โปรดตรวจสอบให้แน่ใจว่าโปรเจ็กต์ SubQuery ของคุณออนไลน์อยู่ใน GitHub repository แบบสาธารณะ ไฟล์ `schema.graphql` ต้องอยู่ในรูทไดเร็กทอรีของคุณ

ในการสร้างโปรเจ็กต์แรกของคุณ ให้ไปที่ [project.subquery.network](https://project.subquery.network) คุณจะต้องตรวจสอบสิทธิ์ด้วยบัญชี GitHub ของคุณเพื่อเข้าสู่ระบบ

ในการเข้าสู่ระบบครั้งแรก คุณจะถูกขอให้ทำการ authorize แก่ SubQuery เราต้องการเพียงที่อยู่อีเมลของคุณเพื่อระบุบัญชีของคุณ และเราไม่ใช้ข้อมูลอื่นใดจากบัญชี GitHub ของคุณด้วยเหตุผลอื่นๆ ในขั้นตอนนี้ คุณยังสามารถขอหรือให้สิทธิ์การเข้าถึงบัญชี GitHub Organization ของคุณเพื่อโพสต์โปรเจ็กต์ SubQuery ภายใต้ GitHub Organization แทนบัญชีส่วนตัวของคุณ

![เพิกถอนการอนุมัติจากบัญชี GitHub](/assets/img/project_auth_request.png)

SubQuery Projects คือที่ที่คุณจัดการโปรเจ็กต์ที่โฮสต์อยู่ทั้งหมดของคุณ ที่อัปโหลดไปยังแพลตฟอร์ม SubQuery คุณสามารถสร้าง ลบ หรือแม้กระทั่งอัปเกรดโปรเจ็กต์ทั้งหมดจากแอปพลิเคชันนี้

![Projects Login](/assets/img/projects-dashboard.png)

หากคุณมีบัญชี GitHub Organization ที่เชื่อมต่ออยู่ คุณสามารถใช้ switcher ที่ header เพื่อเปลี่ยนระหว่างบัญชีส่วนตัวและบัญชี GitHub Organization ได้ โปรเจ็กต์ที่สร้างในบัญชี GitHub Organization จะแชร์ระหว่างสมาชิกใน GitHub Organization นั้นๆ ในการเชื่อมต่อบัญชี GitHub Organization ของคุณ คุณสามารถ[ทำตามขั้นตอนที่นี่](#add-github-organization-account-to-subquery-projects)

![สลับระหว่างบัญชี GitHub](/assets/img/projects-account-switcher.png)

#### สร้างโปรเจ็กต์แรกของคุณ

เริ่มต้นด้วยการคลิกที่ "Create Project" คุณจะถูกนำไปที่แบบฟอร์ม New Project โปรดป้อนข้อมูลต่อไปนี้ (คุณสามารถเปลี่ยนแปลงได้ในอนาคต):
- **บัญชี GitHub:** หากคุณมีบัญชี GitHub มากกว่าหนึ่งบัญชี ให้เลือกบัญชีที่จะใช้สร้างโปรเจ็กต์นี้ โปรเจ็กต์ที่สร้างขึ้นในบัญชี GitHub organisation จะถูกแชร์ระหว่างสมาชิกใน organisation นั้นๆ
- **ชื่อ**
- **ชื่อรอง (Subtitle)**
- **คำอธิบาย**
- **GitHub Repository URL:** ต้องเป็น GitHub URL ที่ใช้งานได้ซึ่งชี้ไปยัง repositoryสาธารณะที่มีโปรเจ็กต์ SubQuery ของคุณ ไฟล์ `schema.graphql` ต้องอยู่ในรูทของไดเร็กทอรีของคุณ ([เรียนรู้เพิ่มเติมเกี่ยวกับโครงสร้างไดเร็กทอรี](../create/introduction.md#directory-structure))
- **Hide project:** หากเลือก จะเป็นการซ่อนโปรเจ็กต์จาก SubQuery explorer สาธารณะ อย่าเลือกตัวเลือกนี้หากคุณต้องการแชร์ SubQuery ของคุณกับชุมชน! ![สร้างโปรเจ็กต์แรกของคุณ](/assets/img/projects-create.png)

สร้างโปรเจ็กต์ของคุณ แล้วคุณจะเห็นในลิสต์รายการโปรเจ็กต์ SubQuery ของคุณ *ใกล้แล้ว! เราแค่ต้องทำการ deploy เป็นเวอร์ชันใหม่*

![สร้างโปรเจ็กต์โดยไม่มีการ deploy](/assets/img/projects-no-deployment.png)

#### Deploy เวอร์ชันแรกของคุณ

ขณะสร้างโปรเจ็กต์จะมีการตั้งค่าลักษณะการแสดงผลของโปรเจ็กต์ คุณต้อง deploy เวอร์ชันของโปรเจ็กต์ก่อนที่จะดำเนินการได้ การ deploy เวอร์ชันจะเปิดการดำเนินการสร้าง SubQuery index ใหม่เพื่อเริ่มต้น และตั้งค่าบริการการสืบค้นที่จำเป็นเพื่อเริ่มยอมรับ GraphQL requests คุณยังสามารถ deploy เวอร์ชันใหม่กับโปรเจ็กต์ที่มีอยู่ได้ที่นี่

ที่โปรเจ็กต์ใหม่ของคุณนี้ คุณจะเห็นปุ่ม Deploy New Version ให้คลิกปุ่ม และกรอกข้อมูลที่จำเป็นเกี่ยวกับการ deploy:
- **Commit Hash of new Version:** ให้คัดลอก commit hash แบบเต็มจากโค้ดโปรเจ็กต์ SubQuery ที่คุณต้องการ deploy จาก GitHub
- **Indexer Version:** คือเวอร์ชันของ node service ของ SubQuery ที่คุณต้องการรัน SubQuery อ่าน [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Query Version:** คือเวอร์ชันของ query service ของ SubQuery ที่คุณต้องการรัน SubQuery อ่าน [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Deploy โปรเจ็กต์แรกของคุณ](https://static.subquery.network/media/projects/projects-first-deployment.png)

หาก deploy ได้สำเร็จ คุณจะเห็น indexer เริ่มทำงานและมีรายงานความคืบหน้าในการทำ indexing ของ chain ในปัจจุบัน ขั้นตอนนี้อาจใช้เวลาระยะหนึ่งจนกว่าจะถึง 100%

## ขั้นตอนต่อไป - เชื่อมต่อกับโปรเจ็กต์ของคุณ
เมื่อการ deploy ของคุณเสร็จสมบูรณ์ และ node ของเราได้ทำการ index ข้อมูลของคุณจาก chain แล้ว คุณจะสามารถเชื่อมต่อกับโปรเจ็กต์ผ่าน GraphQL Query endpoint ที่ปรากฎขึ้นมา

![โปรเจ็กต์ที่กำลัง deploy และ sync](/assets/img/projects-deploy-sync.png)

หรือคุณสามารถคลิกที่จุดสามจุดถัดจากชื่อโปรเจ็กต์ของคุณ และดูใน SubQuery Explorer ซึ่งคุณสามารถใช้ Playground ในเบราว์เซอร์เพื่อเริ่มต้นได้ - [อ่านเพิ่มเติมเกี่ยวกับวิธีใช้ Explorer ของเราที่นี่](../query/query.md)

![โปรเจ็กต์ใน SubQuery Explorer](/assets/img/projects-explorer.png)

## เพิ่มบัญชี GitHub Organization ในโปรเจ็กต์ SubQuery

เป็นเรื่องปกติที่จะเผยแพร่โปรเจ็กต์ SubQuery ภายใต้ชื่อบัญชี GitHub Organization ของคุณ แทนที่จะเป็นบัญชี GitHub ส่วนตัว คุณสามารถเปลี่ยนบัญชีที่เลือกในปัจจุบันของคุณใน [SubQuery Projects](https://project.subquery.network) ได้ทุกเมื่อโดยการใช้ account switcher

![สลับระหว่างบัญชี GitHub](/assets/img/projects-account-switcher.png)

หากคุณไม่เห็นบัญชี GitHub Organization ของคุณที่ switcher คุณอาจต้องให้สิทธิ์การเข้าถึง SubQuery สำหรับ GitHub Organization ของคุณ (หรือขอจากผู้ดูแลระบบ) ในการดำเนินการนี้ คุณจะต้องเพิกถอนการอนุญาตบัญชี GitHub ของคุณกับแอปพลิเคชัน SubQuery ก่อน ในการดำเนินการนี้ ให้เข้าสู่ระบบการตั้งค่าบัญชีของคุณใน GitHub ไปที่ Applications และภายใต้แท็บ Authorized OAuth Apps ให้เพิกถอน SubQuery - [คุณสามารถทำตามขั้นตอนแบบละเอียดได้ที่นี่](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth) **อย่ากังวล การดำเนินการนี้จะไม่ลบโปรเจ็กต์ SubQuery ของคุณและคุณจะไม่สูญเสียข้อมูลใดๆ**

![เพิกถอนการเข้าถึงบัญชี GitHub](/assets/img/project_auth_revoke.png)

เมื่อคุณเพิกถอนการเข้าถึงแล้ว ให้ออกจากระบบ [SubQuery Projects](https://project.subquery.network) และกลับเข้าสู่ระบบใหม่อีกครั้ง คุณจะเข้าไปยังหน้าที่ชื่อว่า *Authorize SubQuery* ซึ่งคุณสามารถขอหรือให้สิทธิ์การเข้าถึง SubQuery กับบัญชี GitHub Organization ของคุณ หากคุณไม่มีสิทธิ์ของผู้ดูแลระบบ คุณต้องขอผู้ดูแลระบบเพื่อเปิดใช้งานสิ่งนี้ให้กับคุณ

![เพิกถอนการอนุมัติจากบัญชี GitHub](/assets/img/project_auth_request.png)

เมื่อคำขอนี้ได้รับการอนุมัติจากผู้ดูแลระบบของคุณ (หรือหากสามารถให้สิทธิ์เองได้) คุณจะเห็นบัญชี GitHub Organization ที่ถูกต้องใน account switcher