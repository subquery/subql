<link rel="stylesheet" href="/assets/style/welcome.css" as="style" />
<div class="top2Sections">
  <section class="welcomeWords">
    <div class="main">
      <div>
        <h2 class="welcomeTitle">ยินดีต้อนรับสู่ <span>Docs</span> ของ SubQuery</h2>
        <p>สำรวจและแปลงข้อมูลเชนของคุณเพื่อสร้าง dApps ที่ใช้งานง่ายเร็วขึ้น!</p>
      </div>
    </div>
  </section>
  <section class="startSection main">
    <div>
      <h2 class="title"><span>คู่มือ</span>สำหรับการเริ่มต้นอย่างรวดเร็ว</h2>
      <p>ทำความเข้าใจ SubQuery โดยลองใช้ตัวอย่าง Hello World แบบทั่วไป การใช้โปรเจ็กต์เทมเพลตภายในสภาพแวดล้อมของ Docker ทำให้คุณสร้างโหนดและทำงานได้อย่างรวดเร็ว และเริ่มการสืบค้นบล็อกเชนในเวลาเพียงไม่กี่นาทีด้วยคำสั่งง่ายๆ
      </p>
      <span class="button">
        <router-link :to="{path: '/quickstart/helloworld-localhost/'}">
          <span>เริ่มต้น</span>
        </router-link>
      </span>
    </div>
  </section>
</div>
<div class="main">
  <div>
    <ul class="list">
      <li>
        <router-link :to="{path: '/tutorials_examples/introduction/'}">
          <div>
            <img src="/assets/img/tutorialsIcon.svg" />
            <span>บทแนะนำและตัวอย่าง</span>
            <p>เรียนรู้จากการลงมือทำ บทช่วยสอนและตัวอย่างเกี่ยวกับวิธีสร้างโปรเจ็กต์ SubQuery</p>
          </div>
        </router-link>
      </li>
      <li>
        <router-link :to="{path: '/create/introduction/'}">
          <div>
            <img src="/assets/img/docsIcon.svg" />
            <span>เอกสารอ้างอิงทางเทคนิค</span>
            <p>เขียนขึ้นโดยนักพัฒนาสำหรับนักพัฒนา ค้นหาสิ่งที่คุณต้องการเพื่อสร้าง dApps ที่ยอดเยี่ยมได้อย่างรวดเร็ว</p>
          </div>
        </router-link>
      </li>
      <li>
        <a href="https://static.subquery.network/whitepaper.pdf" target="_blank">
          <div>
            <img src="/assets/img/networkIcon.svg" />
            <span>SubQuery Network</span>
            <p>อนาคตเกี่ยวกับการกระจายอำนาจของ SubQuery อ่านเพิ่มเติมเกี่ยวกับวิธีการให้รางวัลแก่ indexers และผู้ใช้งาน</p>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>
<section class="faqSection main">
  <div>
    <h2 class="title">คำถามที่พบบ่อย</h2>
    <ul class="faqList">
      <li>
        <div class="title">SubQuery คืออะไร?</div>
        <div class="content">
          <p>SubQuery เป็นโครงการโอเพ่นซอร์สที่ช่วยให้นักพัฒนาสามารถทำการ index เปลี่ยนแปลง และ query ข้อมูลของ Substrate chain เพื่อขับเคลื่อนแอปพลิเคชันของตนได้</p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-subquery'}">อ่านเพิ่มเติม</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">วิธีที่ดีที่สุดในการเริ่มต้นใช้งาน SubQuery คืออะไร?</div>
        <div class="content">
          <p>วิธีที่ดีที่สุดในการเริ่มต้นใช้งาน SubQuery คือทดลองทำตาม <a href="/quickstart/helloworld-localhost/">บทแนะนำ Hello World</a> ของเรา นี่คือขั้นตอนง่ายๆ ในการดาวน์โหลดเทมเพลตเริ่มต้น สร้างโครงการ จากนั้นใช้ Docker เพื่อเรียกใช้โหนดบน localhost ของคุณและรัน query อย่างง่าย </p>
        </div>
      </li>
      <li>
        <div class="title">ฉันจะมีส่วนร่วมหรือให้คำติชมกับ SubQuery ได้อย่างไร?</div>
        <div class="content">
          <p>เรารักการมีส่วนร่วมและข้อเสนอแนะจากชุมชน ในการสนับสนุนโค้ด ให้ fork repository ที่สนใจ และทำการเปลี่ยนแปลง จากนั้นส่ง PR หรือ Pull Request อ้อ อย่าลืมทดสอบด้วยล่ะ! รวมถึงตรวจสอบหลักเกณฑ์การสนับสนุน (TBA) ของเราด้วย </p>
          <span class="more">
            <router-link :to="{path: '/faqs/faqs/#what-is-the-best-way-to-get-started-with-subquery'}">อ่านเพิ่มเติม</router-link>
          </span>
        </div>
      </li>
      <li>
        <div class="title">การโฮสต์โปรเจ็กต์ของฉันใน SubQuery Projects มีค่าใช้จ่ายเท่าไหร่?</div>
        <div class="content">
          <p>การโฮสต์โปรเจ็กต์ของคุณใน SubQuery Projects นั้นฟรี - นั่นเป็นวิธีการตอบแทนชุมชนของเรา หากต้องการเรียนรู้วิธีโฮสต์โปรเจ็กต์ของคุณกับเรา โปรดดูบทแนะนำ <a href="/quickstart/helloworld-hosted/">Hello World (SubQuery hosted)</a></p>
          <span class="more">
            <router-link :to="{path: '/publish/publish/'}">การโฮสต์โปรเจ็กต์ของคุณ</router-link>
          </span>
        </div>
      </li>
    </ul><br>
    สำหรับคำถามที่พบบ่อยเพิ่มเติม โปรดดูที่ <router-link :to="{path: '/faqs/faqs/'}">หน้า FAQ</router-link> ของเรา    
  </div>
</section>
<section class="main">
  <div>
    <div class="lastIntroduce lastIntroduce_1">
        <h5>การผสานรวมกับ Custom Chain ของคุณ?</h5>
        <p>ไม่ว่าคุณกำลังสร้าง Parachain ใหม่หรือ blockchain ใหม่ทั้งหมดบน Substrate - SubQuery สามารถช่วยคุณ index และแก้ไขปัญหาข้อมูลของ chain ของคุณ SubQuery ได้รับการออกแบบให้สามารถรวมกับ Substrate แบบกำหนดเองได้อย่างง่ายดาย</p>
        <span class="more">
          <router-link :to="{path: '/create/mapping/#custom-substrate-chains'}">เรียนรู้วิธีการรวมกับ chain ของคุณ</router-link>
        </span>
    </div>
    <div class="lastIntroduce lastIntroduce_2">
        <h5>การสนับสนุนและการมีส่วนร่วม</h5>
        <p>มีคำถาม หรือต้องการที่จะทราบข้อมูลเพิ่มเติม หรือคุณจะมีส่วนร่วมได้อย่างไร? เรายินดีที่จะรับฟังคุณ โปรดติดต่อเราทางอีเมลหรือโซเชียลมีเดียจากลิงก์ด้านล่าง ต้องการความเชี่ยวชาญด้านเทคนิคหรือไม่? เข้าร่วมชุมชน Discord ของเราและรับการสนับสนุนจากสมาชิกที่กระตือรือร้นของเราในชุมชน </p>
        <a class="more" target="_blank" href="https://discord.com/invite/78zg8aBSMG">เข้าร่วมการสนทนาบน DISCORD</a>
    </div>
    </div>
</section>
<section class="main connectSection">
  <div class="email">
    <span>ติดต่อเรา</span>
    <a href="mailto:hello@subquery.network">สวัสดี@subquery.network</a>
  </div>
  <div>
    <div>ติดตามเราบนโซเชียล</div>
    <div class="connectWay">
      <a href="https://discord.com/invite/78zg8aBSMG" target="_blank" class="connectDiscord">discord</a>
      <a href="https://twitter.com/subquerynetwork" target="_blank" class="connectTwitter">twitter</a>
      <a href="https://medium.com/@subquery" target="_blank" class="connectMedium">medium</a>
      <a href="https://t.me/subquerynetwork" target="_blank" class="connectTelegram">telegram</a>
      <a href="https://github.com/OnFinality-io/subql" target="_blank" class="connectGithub">github</a>
      <a href="https://matrix.to/#/#subquery:matrix.org" target="_blank" class="connectMatrix">matrix</a>
      <a href="https://www.linkedin.com/company/subquery" target="_blank" class="connectLinkedin">linkedin</a>
    </div>
  </div>
</section>
</div> </div>
<div class="footer">
  <div class="main"><div>SubQuery © 2021</div></div>
</div>
<script charset="utf-8" src="/assets/js/welcome.js"></script>
