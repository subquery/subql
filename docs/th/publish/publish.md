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

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

SubQuery Projects คือที่ที่คุณจัดการโปรเจ็กต์ที่โฮสต์อยู่ทั้งหมดของคุณ ที่อัปโหลดไปยังแพลตฟอร์ม SubQuery คุณสามารถสร้าง ลบ หรือแม้กระทั่งอัปเกรดโปรเจ็กต์ทั้งหมดจากแอปพลิเคชันนี้

![Projects Login](/assets/img/projects-dashboard.png)

หากคุณมีบัญชี GitHub Organization ที่เชื่อมต่ออยู่ คุณสามารถใช้ switcher ที่ header เพื่อเปลี่ยนระหว่างบัญชีส่วนตัวและบัญชี GitHub Organization ได้ โปรเจ็กต์ที่สร้างในบัญชี GitHub Organization จะแชร์ระหว่างสมาชิกใน GitHub Organization นั้นๆ ในการเชื่อมต่อบัญชี GitHub Organization ของคุณ คุณสามารถ[ทำตามขั้นตอนที่นี่](#add-github-organization-account-to-subquery-projects)

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

#### สร้างโปรเจ็กต์แรกของคุณ

เริ่มต้นด้วยการคลิกที่ "Create Project" คุณจะถูกนำไปที่แบบฟอร์ม New Project โปรดป้อนข้อมูลต่อไปนี้ (คุณสามารถเปลี่ยนแปลงได้ในอนาคต):
- **บัญชี GitHub:** หากคุณมีบัญชี GitHub มากกว่าหนึ่งบัญชี ให้เลือกบัญชีที่จะใช้สร้างโปรเจ็กต์นี้ โปรเจ็กต์ที่สร้างขึ้นในบัญชี GitHub organisation จะถูกแชร์ระหว่างสมาชิกใน organisation นั้นๆ
- **ชื่อ**
- **ชื่อรอง (Subtitle)**
- **คำอธิบาย**
- **GitHub Repository URL:** ต้องเป็น GitHub URL ที่ใช้งานได้ซึ่งชี้ไปยัง repositoryสาธารณะที่มีโปรเจ็กต์ SubQuery ของคุณ ไฟล์ `schema.graphql` ต้องอยู่ในรูทของไดเร็กทอรีของคุณ ([เรียนรู้เพิ่มเติมเกี่ยวกับโครงสร้างไดเร็กทอรี](../create/introduction.md#directory-structure))
- **Hide project:** หากเลือก จะเป็นการซ่อนโปรเจ็กต์จาก SubQuery explorer สาธารณะ อย่าเลือกตัวเลือกนี้หากคุณต้องการแชร์ SubQuery ของคุณกับชุมชน! ![Create your first Project](/assets/img/projects-create.png)

สร้างโปรเจ็กต์ของคุณ แล้วคุณจะเห็นในลิสต์รายการโปรเจ็กต์ SubQuery ของคุณ *ใกล้แล้ว! เราแค่ต้องทำการ deploy เป็นเวอร์ชันใหม่*

![Created Project with no deployment](/assets/img/projects-no-deployment.png)

#### Deploy เวอร์ชันแรกของคุณ

ขณะสร้างโปรเจ็กต์จะมีการตั้งค่าลักษณะการแสดงผลของโปรเจ็กต์ คุณต้อง deploy เวอร์ชันของโปรเจ็กต์ก่อนที่จะดำเนินการได้ การ deploy เวอร์ชันจะเปิดการดำเนินการสร้าง SubQuery index ใหม่เพื่อเริ่มต้น และตั้งค่าบริการการสืบค้นที่จำเป็นเพื่อเริ่มยอมรับ GraphQL requests คุณยังสามารถ deploy เวอร์ชันใหม่กับโปรเจ็กต์ที่มีอยู่ได้ที่นี่

ที่โปรเจ็กต์ใหม่ของคุณนี้ คุณจะเห็นปุ่ม Deploy New Version ให้คลิกปุ่ม และกรอกข้อมูลที่จำเป็นเกี่ยวกับการ deploy:
- **Commit Hash of new Version:** From GitHub, copy the full commit hash of the version of your SubQuery project codebase that you want deployed
- **Indexer Version:** This is the version of SubQuery's node service that you want to run this SubQuery on. See [`@subql/node`](https://www.npmjs.com/package/@subql/node)
- **Query Version:** This is the version of SubQuery's query service that you want to run this SubQuery on. See [`@subql/query`](https://www.npmjs.com/package/@subql/query)

![Deploy your first Project](https://static.subquery.network/media/projects/projects-first-deployment.png)

If deployed successfully, you'll see the indexer start working and report back progress on indexing the current chain. This process may take time until it reaches 100%.

## Next Steps - Connect to your Project
Once your deployment has succesfully completed and our nodes have indexed your data from the chain, you'll be able to connect to your project via the displayed GraphQL Query endpoint.

![Project being deployed and synced](/assets/img/projects-deploy-sync.png)

Alternatively, you can click on the three dots next to the title of your project, and view it on SubQuery Explorer. There you can use the in-browser playground to get started - [read more about how to user our Explorer here](../query/query.md).

![Projects in SubQuery Explorer](/assets/img/projects-explorer.png)

## Add GitHub Organization Account to SubQuery Projects

It is common to publish your SubQuery project under the name of your GitHub Organization account rather than your personal GitHub account. At any point your can change your currently selected account on [SubQuery Projects](https://project.subquery.network) using the account switcher.

![Switch between GitHub accounts](/assets/img/projects-account-switcher.png)

If you can't see your GitHub Organization account listed in the switcher, the you may need to grant access to SubQuery for your GitHub Organization (or request it from an administrator). To do this, you first need to revoke permissions from your GitHub account to the SubQuery Application. To do this, login to your account settings in GitHub, go to Applications, and under the Authorized OAuth Apps tab, revoke SubQuery - [you can follow the exact steps here](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/reviewing-your-authorized-applications-oauth). **Don't worry, this will not delete your SubQuery project and you will not lose any data.**

![Revoke access to GitHub account](/assets/img/project_auth_revoke.png)

Once you have revoked access, log out of [SubQuery Projects](https://project.subquery.network) and log back in again. You should be redirected to a page titled *Authorize SubQuery* where you can request or grant SubQuery access to your GitHub Organization account. If you don't have admin permissions, you must make a request for an adminstrator to enable this for you.

![Revoke approval from a GitHub account](/assets/img/project_auth_request.png)

Once this request has been approved by your administrator (or if are able to grant it youself), you will see the correct GitHub Organization account in the account switcher.