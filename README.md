# 🎨 SSSParty — ระบบห้องเรียนส่งงานและเช็กชื่อชุมนุมสื่อสร้างสรรค์

<p align="center">
  <strong>แพลตฟอร์มบริหารจัดการการเรียนการสอน เช็กชื่อ และส่งงานดิจิทัลสำหรับชุมนุมสื่อสร้างสรรค์</strong><br>
  ออกแบบด้วยดีไซน์ <em>Cozy & Warm UI</em> (โทนครีม-วานิลลา-อิฐดินเผา) ใช้งานง่าย ลื่นไหล ปลอดภัยบนทุกอุปกรณ์
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Runtime-Bun-f472b6?style=flat-square&logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker Ready" />
</p>

---

## 🌟 ฟีเจอร์หลักของระบบ (Key Features)

### 1. 📅 ระบบเช็กชื่ออัจฉริยะ (Smart Attendance System)
- **ปฏิทินตรวจนับรอบอัตโนมัติ**: สร้างรอบเช็กชื่อรายสัปดาห์ตามวันที่ในปฏิทินโดยไม่ต้องตั้งชื่อรอบเอง
- **ตรวจจับวันหยุดราชการไทย**: เชื่อมโยงฐานข้อมูลวันหยุดไทย (`date-holidays`) แจ้งเตือนวันหยุดอัตโนมัติบนปฏิทิน
- **สลับมุมมองได้ตามความถนัด (View Mode Switcher)**:
  - **📋 แบบตาราง (Table View)**: ตารางรายชื่อเรียงตามเลขที่หรือชั้นเรียน พร้อมปุ่มกดรวดเร็ว เหมาะสำหรับการเช็กชื่อหน้าคอมพิวเตอร์
  - **🗂️ แบบการ์ด (Card View)**: การ์ดสัมผัสขนาดใหญ่จัดเรียงแบบ Responsive Grid (1-3 คอลัมน์) เหมาะกับการเดินเช็กชื่อผ่านแท็บเล็ตหรือสมาร์ตโฟน
- **สถานะ 4 รูปแบบ**: มาเรียน (Present), มาสาย (Late), ลา (Leave), ขาดเรียน (Absent) พร้อมช่องบันทึกหมายเหตุรายคน
- **ปุ่มอำนวยความสะดวก**: กด "มาเรียนทั้งหมด" ในคลิกเดียว และมีระบบบันทึกแบบ Batch Transaction เพื่อความเสถียรสูงสุด

### 2. 📝 ระบบสั่งงานและส่งงานหลากรูปแบบ (Flexible Assignments)
- **รองรับ 3 รูปแบบการส่งงาน**:
  1. **📁 แนบไฟล์งาน (File Upload)**: รองรับไฟล์ทุกรูปแบบ (รูปภาพ, PDF, Word, Excel, PowerPoint, วิดีโอ/เสียง, ZIP) สูงสุด 50MB
  2. **🔗 ส่งลิงก์ผลงาน (URL Link)**: รองรับผลงานภายนอก เช่น Canva, Google Drive, Figma พร้อมปุ่มเปิดทดสอบลิงก์
  3. **❓ ตอบข้อคำถาม (Questionnaire)**: ครูสร้างข้อคำถามได้หลายข้อ กำหนดข้อจำเป็น/คำใบ้ และนักเรียนพิมพ์ตอบทีละข้อ
- **เครื่องมือเขียนคำสั่งงาน Markdown สไตล์ Word (`MarkdownEditor`)**:
  - แถบเครื่องมือเสมือน Word: ตัวหนา, ตัวเอียง, หัวข้อใหญ่/กลาง/เล็ก (H1, H2, H3), รายการหัวข้อย่อย, ตาราง, และกล่องข้อความ
  - แท็บ Live Preview พรีวิวข้อความจริงขณะพิมพ์
- **ครูสามารถแนบเอกสารและรูปภาพประกอบโจทย์ได้**: อัปโหลดไฟล์ประกอบคำสั่งงานให้นักเรียนดาวน์โหลดหรือเปิดดูตัวอย่าง
- **คำถามแนบรูปภาพประจำข้อได้**: แต่ละข้อคำถามสามารถอัปโหลดรูปภาพโจทย์เฉพาะข้อได้ เพื่อให้นักเรียนดูรูปและพิมพ์ตอบคำถาม

### 3. 💾 ระบบบันทึกแบบร่างการส่งงาน (Draft Submissions)
- นักเรียนสามารถกด **"บันทึกแบบร่าง (Save Draft)"** เพื่อบันทึกคำตอบ ไฟล์ หรือลิงก์เก็บไว้ก่อน โดยยังไม่ถือว่าส่งอย่างเป็นทางการ
- ครูสามารถเปิดดูความคืบหน้าของงานที่นักเรียนบันทึกแบบร่างไว้ได้
- **ระบบล็อกการให้คะแนน**: ระบบจะแสดงแบนเนอร์แจ้งเตือนและล็อกการกรอกคะแนนไว้ จนกว่านักเรียนจะกด **"ยืนยันส่งงาน (Turn In)"**

### 4. 🎯 ห้องตรวจงานเสมือนสตูดิโอ (Teacher Grading Studio)
- **Split-Screen Studio**: แบ่งหน้าจอ 2 ฝั่ง (ฝั่งซ้ายพรีวิวผลงานสด 55% / ฝั่งขวาตารางประเมินรูบริก 45%)
- **ตัวแสดงผลไฟล์หลากหลาย (Rich Media Previewer)**:
  - โปรแกรมดูรูปภาพแบบซูมเข้า/ออก และหมุนภาพ (Rotate)
  - เครื่องเล่นวิดีโอและไฟล์เสียง HTML5
  - ตัวอ่านเอกสาร PDF ในตัว
  - การ์ดเฉพาะสำหรับไฟล์ Microsoft Office (Word, Excel, PowerPoint) พร้อมปุ่มเปิดดูออนไลน์ผ่าน Google Docs Viewer
  - Fallback Alert Card พร้อมปุ่มดาวน์โหลดไฟล์ทันทีหากเบราว์เซอร์ไม่รองรับ
- **ระบบประเมินรูบริกตามเกณฑ์ (Interactive Rubric Table)**:
  - ประเมินคะแนนแยกตามหัวข้อเกณฑ์ พร้อมคำนวณคะแนนรวมและเกรดเฉลี่ย (A, B, C, D, F) อัตโนมัติแบบเรียลไทม์
  - ปุ่มให้คะแนนด่วน (0%, 50%, 75%, 100%)
  - ช่องเขียนคำติชมรายข้อ และคำติชมภาพรวม (Overall Feedback)

### 5. 👥 ระบบจัดการข้อมูลนักเรียนและโปรไฟล์
- นำเข้าข้อมูลนักเรียนแบบกลุ่มผ่านไฟล์ Excel (.xlsx) หรือ CSV พร้อมระบบ Auto-detect คอลัมน์
- นักเรียนสามารถเข้าสู่ระบบ ดูประวัติการเข้าเรียน ภาระงาน คะแนนที่ได้รับ และตั้งรหัสผ่านสำหรับตนเองได้

### 6. 🛡️ ความปลอดภัยระดับองค์กร (Enterprise-Grade Security)
- **Authentication**: JWT เก็บใน HTTP-Only, Secure, SameSite=Lax Cookies
- **HTTP Security Headers**: บังคับใช้ Content-Security-Policy (CSP `frame-ancestors 'self'`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, และ HSTS
- **Storage Security**: เข้าถึงไฟล์ผ่าน Server-side Proxy API ป้องกัน IDOR และ Path Traversal
- **UI Hardening**: นำค่าเริ่มต้น (Default Credentials) และข้อมูลทดสอบออกจากหน้าล็อกอิน 100%

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี |
|---|---|
| **Framework** | [Next.js 16 (App Router + Turbopack)](https://nextjs.org/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Runtime & Package Manager** | [Bun 1.3](https://bun.sh/) |
| **Frontend & UI** | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [SweetAlert2](https://sweetalert2.github.io/) |
| **Rich Text** | [react-markdown](https://github.com/remarkjs/react-markdown), [remark-gfm](https://github.com/remarkjs/remark-gfm) |
| **Database & ORM** | [PostgreSQL 16](https://www.postgresql.org/), [Prisma ORM 7](https://www.prisma.io/) (via `@prisma/adapter-pg`) |
| **Object Storage** | S3-Compatible (Cloudflare R2, AWS S3, MinIO) via `@aws-sdk/client-s3` |
| **Container & Deploy** | Docker Multi-stage, Docker Compose, Next.js Standalone |

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- [Bun](https://bun.sh/) (แนะนำ v1.3 ขึ้นไป) หรือ Node.js 20+
- ฐานข้อมูล [PostgreSQL](https://www.postgresql.org/) (Local, Docker, หรือ Cloud เช่น Supabase/Neon)

### 1. ติดตั้ง Dependencies
```bash
bun install
```

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (.env)
คัดลอกไฟล์ตัวอย่าง `.env.example` เป็น `.env`
```bash
cp .env.example .env
```
กำหนดค่าที่จำเป็นใน `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sssparty?schema=public"
JWT_SECRET="your-secure-random-string-at-least-32-characters"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# การตั้งค่า S3-Compatible Storage (Cloudflare R2 / AWS S3 / MinIO)
S3_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="sssparty-submissions"
S3_ACCESS_KEY_ID="your_access_key"
S3_SECRET_ACCESS_KEY="your_secret_key"
```

### 3. รันการย้ายโครงสร้างฐานข้อมูล (Database Migration)
```bash
bun run db:generate
bun run db:deploy
bun run db:seed
```

### 4. สตาร์ต Development Server
```bash
bun run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 📦 คำสั่งสคริปต์ที่สำคัญ (Available Scripts)

```bash
# รันเซิร์ฟเวอร์สำหรับการพัฒนา (Development)
bun run dev

# คอมไพล์โปรเจกต์สำหรับ Production (รัน prisma generate ก่อน next build อัตโนมัติ)
bun run build

# สตาร์ต Production Server (รัน prisma migrate deploy ก่อน next start อัตโนมัติ)
bun run start

# นำการเปลี่ยนแปลง Database Migration ไปปรับใช้จริง
bun run db:deploy

# สั่งสร้าง Prisma Client ใหม่
bun run db:generate

# นำเข้าบัญชีผู้ดูแลระบบ Admin เริ่มต้นสำหรับเข้าใช้งานครั้งแรก
bun run db:seed
```

---

## 🐳 การ Deploy ด้วย Docker & Docker Compose

ระบบมีไฟล์ `Dockerfile` (Multi-stage) และ `docker-compose.yml` พร้อมใช้งาน:

```bash
# สั่งสร้างและรันระบบทั้งเว็บแอปพลิเคชันและ PostgreSQL
docker compose up -d --build

# นำโครงสร้างฐานข้อมูลไปปรับใช้
docker compose exec app bun run db:deploy
docker compose exec app bun run db:seed
```

> 📖 อ่านคู่มือการนำขึ้นเซิร์ฟเวอร์จริงฉบับสมบูรณ์ (Nginx, SSL, Backup Cronjob, PM2) ได้ที่ [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🩺 การตรวจสอบสถานะระบบ (Health Check)

ระบบมี Endpoint สำหรับตรวจสอบสถานะของเซิร์ฟเวอร์และการเชื่อมต่อฐานข้อมูล:
```http
GET /api/health
```
**ตัวอย่างการตอบกลับ (HTTP 200):**
```json
{
  "status": "healthy",
  "uptimeSeconds": 3600,
  "timestamp": "2026-09-03T16:00:00.000Z",
  "database": {
    "status": "connected",
    "latencyMs": 5
  },
  "environment": "production"
}
```

---

## 📄 ลิขสิทธิ์ (License)
พัฒนาขึ้นสำหรับ **ชุมนุมสื่อสร้างสรรค์ (SSSParty)** — โรงเรียนมัธยมศึกษา
สงวนลิขสิทธิ์ © 2026 SSSParty Team.
