# แผนการดำเนินงานและสถาปัตยกรรมระบบ: "ชุมนุมสื่อสร้างสรรค์" (SSSParty)

ระบบส่งงานสำหรับ **ชุมนุมสื่อสร้างสรรค์** ในรูปแบบ Classroom ขนาดกะทัดรัด ปลอดภัยสูง และใช้งานง่าย พัฒนาบน Next.js 16 App Router, TypeScript, Prisma ORM 7, PostgreSQL, S3-Compatible Object Storage และธีม Cozy Yellow + Red

---

## สรุปภาพรวมสถาปัตยกรรมระบบ (System Architecture)

```text
[ Client (Browser / Mobile) ]
       │
       ▼ (HTTPS / Cookies / Strict Headers)
[ Next.js 16 Proxy (Reverse Proxy / Middleware: src/proxy.ts) ]
  ├── Security Headers (CSP, HSTS, X-Frame-Options: DENY, nosniff)
  └── RBAC Route Guard (JWT Verification for /admin/* and /student/*)
       │
       ├──► [ App Router: Pages & Server Actions ]
       │      ├── Auth Engine (jsonwebtoken, bcryptjs, httpOnly cookies)
       │      ├── Zod Validation Layer (Inputs, Rubrics, Files)
       │      └── Transaction Safety Layer ($transaction)
       │             │
       │             ▼
       │      [ Prisma ORM 7 (src/lib/prisma/client.ts) ]
       │             │
       │             ▼ (PostgreSQL Database)
       │      [ Users, Students, Assignments, Rubrics, Submissions, Grades ]
       │
       └──► [ S3 Storage Service (Zero-Trust Presigned URLs) ]
              ├── Presigned PUT URL (Upload งานตรงไปที่ S3 Storage)
              └── Presigned GET URL (เปิดดู/พรีวิวชิ้นงานเฉพาะผู้มีสิทธิ์)
```

---

## กฎเหล็กและการปฏิบัติตามมาตรฐานทางเทคนิค

1. **Prisma 7 Standard**:
   - ห้ามเปลี่ยนหรืออัปเกรดเวอร์ชันของ Prisma (คงไว้ที่ Prisma 7.10.0 ตามที่ติดตั้งไว้)
   - ใช้คำสั่ง `prisma migrate dev --name <migration_name>` เท่านั้น
   - **ห้าม** ใช้ `prisma db push` โดยเด็ดขาด
   - **ห้าม** ใช้ `prisma migrate reset` หาก Prisma เตือนว่าจะ Reset ให้หยุดและแจ้งผู้ใช้ทันที
   - กำหนด Client ผ่าน `prisma.config.ts` และ generator output `../src/generated/prisma`
2. **ความปลอดภัยระดับสูง (Defense-in-Depth)**:
   - **JWT**: ใช้ `jsonwebtoken` ลงนามโทเค็น มี expiration time กำกับ และจัดเก็บใน Cookie แบบ `httpOnly`, `secure`, `sameSite: "lax"`
   - **Password**: แฮชรหัสผ่านครู/Admin ด้วย `bcryptjs` (Salt Rounds 10-12)
   - **Next.js 16 Proxy**: กำหนดที่ `src/proxy.ts` ตรวจสอบ Role-based Access Control (RBAC) และแนบ Security Headers ป้องกันการโจมตี (XSS, Clickjacking, MIME-sniffing)
   - **S3 Security**: S3 Bucket เป็น Private 100%, Server เป็นผู้สร้าง Object Key เท่านั้น และตรวจสอบ Ownership ก่อนออก Presigned GET URL
3. **Teacher Grading Studio**:
   - หน้าตรวจงานต้องแสดง **ตัวอย่างงานของนักเรียน (Live File Previewer)** ทั้ง PDF, รูปภาพ, มัลติมีเดีย (วิดีโอ/เสียง)
   - มี **ตารางการให้คะแนนตามเกณฑ์ (Rubric Table)** พร้อมระบบ **คำนวณคะแนนรวมแบบ Real-Time** ก่อนบันทึกผ่าน Database Transaction

---

## รายละเอียดแผนการทำงานทีละ Phase (Phase-by-Phase Plan)

### Phase 1 — การเตรียมสภาพแวดล้อมและติดตั้ง Dependencies
- **เป้าหมาย**: ตรวจสอบความเข้ากันได้ของระบบ และติดตั้งเครื่องมือความปลอดภัยที่จำเป็น โดยไม่กระทบกับ Prisma 7
- **งานที่ต้องทำ**:
  1. ตรวจสอบ `package.json`, Bun runtime, Next.js 16, React 19
  2. ติดตั้ง Dependencies สำหรับความปลอดภัยและ UI:
     - `jsonwebtoken` และ `@types/jsonwebtoken`
     - `bcryptjs` และ `@types/bcryptjs`
     - `zod`
     - `sweetalert2`
     - `@aws-sdk/client-s3` และ `@aws-sdk/s3-request-presigner`
     - `lucide-react`
  3. ตรวจสอบการตั้งค่า `tsconfig.json` และ Environment Variables พื้นฐานใน `.env`

---

### Phase 2 — การตั้งค่า Prisma 7 Client Integration & Database Safety
- **เป้าหมาย**: สร้าง Database Adapter และ Prisma Client Singleton ที่รองรับ Next.js 16 App Router
- **งานที่ต้องทำ**:
  1. สร้าง `src/lib/prisma/client.ts` โดยใช้ `@prisma/adapter-pg` ร่วมกับ `pg.Pool` ตามข้อกำหนด Prisma 7
  2. ป้องกัน Connection Pool ล้น (Connection Leak) ในโหมด Next.js Development
  3. สร้าง `src/lib/prisma/db-error.ts` เพื่อแปลง Database Errors เป็น User-friendly Error Messages ป้องกันการรั่วไหลของข้อมูลภายในระบบ

---

### Phase 3 — การออกแบบ Database Schema พร้อม Integrity Constraints
- **เป้าหมาย**: สร้างโครงสร้างฐานข้อมูลที่มีความปลอดภัยสูงและสอดคล้องกับโครงสร้างของ "ชุมนุมสื่อสร้างสรรค์" ใน `prisma/schema.prisma`
- **ตารางและฟิลด์**:
  1. `User`:
     - `id` (cuid/uuid), `username` (unique), `passwordHash` (nullable), `role` (`STUDENT`, `ADMIN`), `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`
  2. `Student`:
     - `id`, `userId` (unique), `studentCode` (unique), `firstName`, `lastName`, `className`, `studentNumber`, `status` (`ACTIVE`, `INACTIVE`), `createdAt`, `updatedAt`
     - Constraints: `@@unique([className, studentNumber])`
     - Indexes: `studentCode`, `className`
  3. `Assignment`:
     - `id`, `title`, `description`, `maxScore`, `dueDate`, `status` (`DRAFT`, `PUBLISHED`, `CLOSED`), `createdBy`, `createdAt`, `updatedAt`
     - Indexes: `status`, `dueDate`
  4. `AssignmentRubric`:
     - `id`, `assignmentId`, `name`, `description`, `maxScore`, `sortOrder`, `createdAt`
     - Relation: `Assignment` (Cascade delete เมื่อไม่มี Submission)
  5. `Submission`:
     - `id`, `assignmentId`, `studentId`, `fileKey`, `fileName`, `fileSize`, `mimeType`, `comment`, `submittedAt`, `status` (`SUBMITTED`, `LATE`, `GRADED`), `createdAt`, `updatedAt`
     - Constraints: `@@unique([assignmentId, studentId])` ป้องกันส่งงานซ้ำ
     - Indexes: `assignmentId`, `studentId`, `status`
  6. `Grade`:
     - `id`, `submissionId` (unique), `score`, `feedback`, `gradedBy`, `gradedAt`, `createdAt`, `updatedAt`
  7. `RubricScore`:
     - `id`, `gradeId`, `rubricId`, `score`, `note`
     - Constraints: `@@unique([gradeId, rubricId])`

---

### Phase 4 — Migration และการเตรียม Seed Data
- **เป้าหมาย**: รัน Migration เพื่อสร้างตารางใน PostgreSQL และเตรียมข้อมูลเริ่มต้นที่ปลอดภัย
- **งานที่ต้องทำ**:
  1. ดำเนินการสร้าง Migration แรก:
     ```bash
     bun x prisma migrate dev --name init
     ```
     *(หากระบบมีข้อความแจ้งเตือนว่าจะ reset ข้อมูล ให้หยุดและถามผู้ใช้ทันที)*
  2. สร้างไฟล์ `prisma/seed.ts`:
     - สร้างบัญชี Admin/ครู: `username: "admin"`, รหัสผ่านแฮช `admin123` ด้วย `bcryptjs`
     - สร้างข้อมูลนักเรียนตัวอย่าง 5 คน สำหรับชุมนุมสื่อสร้างสรรค์ (เช่น ม.4/1, ม.5/2, ม.6/1)
     - สร้างการบ้านตัวอย่าง 2 งาน:
       - งานที่ 1: "ออกแบบแบนเนอร์ประชาสัมพันธ์ชุมนุมสื่อสร้างสรรค์" (คะแนนเต็ม 20) พร้อม Rubric 4 ข้อ (8 + 5 + 4 + 3 = 20)
       - งานที่ 2: "ตัดต่อคลิปสั้น Storyboard เล่าเรื่องชุมนุม" (คะแนนเต็ม 30) พร้อม Rubric 3 ข้อ (15 + 10 + 5 = 30)
  3. รัน Seed ผ่าน `bun x prisma db seed`

---

### Phase 5 — ระบบ Authentication, JWT, Bcrypt และ Next.js 16 Proxy
- **เป้าหมาย**: วางระบบยืนยันตัวตนและการป้องกันเส้นทางแบบ Zero-Trust
- **งานที่ต้องทำ**:
  1. **โมดูลความปลอดภัย (`src/lib/auth/`)**:
     - `jwt.ts`: สร้าง Token, ถอดรหัส, และตรวจสอบ Signature ด้วย `JWT_SECRET`
     - `password.ts`: ฟังก์ชัน `hashPassword(plain)` และ `comparePassword(plain, hash)` ด้วย `bcryptjs`
     - `cookies.ts`: จัดการคุกกี้ `auth_token` แบบ `httpOnly`, `secure`, `sameSite: "lax"`, `path: "/"`
  2. **Next.js 16 Proxy (`src/proxy.ts`)**:
     - ติดตั้งตามมาตรฐานใหม่ของ Next.js 16
     - จัดการ **Security Headers**:
       - `Content-Security-Policy`: ป้องกันการฉีดสคริปต์ (XSS)
       - `X-Frame-Options: DENY`: ป้องกัน Clickjacking
       - `X-Content-Type-Options: nosniff`: ป้องกัน MIME-sniffing
       - `Strict-Transport-Security`: บังคับ HTTPS
       - `Referrer-Policy: strict-origin-when-cross-origin`
     - จัดการ **RBAC Route Protection**:
       - เส้นทาง `/admin/*`: ต้องมี Role `ADMIN` เท่านั้น หากไม่มีให้ Redirect ไป `/admin-login`
       - เส้นทาง `/student/*`: ต้องมี Role `STUDENT` เท่านั้น หากไม่มีให้ Redirect ไป `/student-login`
       - ป้องกันผู้ใช้ที่ล็อกอินแล้วเข้าหน้า Login ซ้ำ
  3. **Server Actions สำหรับเข้าสู่ระบบ**:
     - `studentLoginAction`: ตรวจสอบ `studentCode` + `className` + `studentNumber` (ต้อง ACTIVE)
     - `adminLoginAction`: ตรวจสอบ `username` และเปรียบเทียบรหัสผ่านด้วย `bcryptjs`
     - `logoutAction`: เคลียร์คุกกี้และนำผู้ใช้ออกจากระบบ

---

### Phase 6 — ระบบจัดการ Assignment และ Rubric Engine
- **เป้าหมาย**: สร้างระบบจัดการชิ้นงานของครู พร้อมระบบตรวจสอบ Rubric อัตโนมัติ
- **งานที่ต้องทำ**:
  1. หน้าสร้างการบ้าน (`/admin/assignments/new`):
     - ฟอร์มกรอกชื่อ, รายละเอียด, กำหนดส่ง, คะแนนเต็ม
     - **Dynamic Rubric Builder**: UI สำหรับเพิ่ม/ลบเกณฑ์การให้คะแนน กำหนดชื่อ คำอธิบาย และคะแนนเต็มของแต่ละข้อ
     - Real-time Sum Check: แสดงผลรวมคะแนน Rubric ทันที และตรวจสอบว่าเท่ากับคะแนนเต็มของงานหรือไม่
  2. **Server-Side Validation (Zod)**:
     - ตรวจสอบว่ามีเกณฑ์ Rubric อย่างน้อย 1 ข้อ
     - ตรวจสอบอย่างเคร่งครัด: `SUM(rubrics.maxScore) === assignment.maxScore`
  3. ฟังก์ชัน Publish และ Close งาน
  4. **Rubric Immutability Locking**: หากมีนักเรียนส่งงานแล้ว (`submissionCount > 0`) ระบบจะล็อกไม่ให้อนุญาตให้แก้ไขหรือลบ Rubric เพื่อรักษาความถูกต้องของประวัติคะแนน

---

### Phase 7 — S3 Object Storage Service & Secure Presigned URLs
- **เป้าหมาย**: ระบบจัดเก็บไฟล์ที่ไม่ผ่านเซิร์ฟเวอร์โดยตรง และจำกัดสิทธิ์การเข้าถึงไฟล์อย่างเข้มงวด
- **งานที่ต้องทำ**:
  1. สร้าง `src/lib/s3/client.ts` เชื่อมต่อ S3-Compatible Storage (AWS S3, MinIO, Cloudflare R2)
  2. สร้าง `src/lib/s3/presigned.ts`:
     - `createUploadPresignedUrl()`: ออก Presigned PUT URL อายุ 5 นาที โดยกำหนด Object Key อัตโนมัติจากฝั่ง Server:
       `assignments/{assignmentId}/submissions/{studentId}/{uuid}-{filename}`
     - `createDownloadPresignedUrl()`: ออก Presigned GET URL อายุ 15 นาที
  3. **Ownership Authorization Check**:
     - เมื่อมีการขอ URL เปิดดูไฟล์:
       - ครู/Admin: อนุญาตให้ดูได้ทุกไฟล์
       - นักเรียน: อนุญาตเฉพาะไฟล์งานที่เป็น `studentId` ของตนเองเท่านั้น หากไม่ใช่ ให้ปฏิเสธ (403 Forbidden)
  4. **File Validation Layer (`src/lib/s3/file-validator.ts`)**:
     - จำกัดขนาดไฟล์สูงสุด `MAX_UPLOAD_SIZE = 20MB`
     - ตรวจสอบ Whitelist ประเภทไฟล์: PDF, รูปภาพ (PNG, JPG, WebP), มัลติมีเดีย (MP4, MP3), เอกสาร (DOCX, PPTX, XLSX), ZIP

---

### Phase 8 — ระบบส่งงานของนักเรียน (Student Submission Flow)
- **เป้าหมาย**: หน้าส่งงานที่ใช้งานง่ายบนมือถือ พร้อมระบบยืนยันและการอัปโหลดตรงไปที่ S3
- **งานที่ต้องทำ**:
  1. หน้ารายการงานของนักเรียน (`/student/assignments`) แบ่งสถานะ: ยังไม่ส่ง, รอตรวจ, ตรวจแล้ว, ส่งล่าช้า
  2. หน้ารายละเอียดงาน (`/student/assignments/[id]`):
     - แสดงรายละเอียดงาน คำสั่ง และเกณฑ์ Rubric แบบ Read-only
     - ฟอร์มเลือกไฟล์งานและกล่องกรอกความคิดเห็นเพิ่มเติม
  3. Flow การส่งงาน:
     - Client ทำการตรวจขนาดและประเภทไฟล์เบื้องต้น
     - ร้องขอ Presigned PUT URL จาก Server
     - แสดงหน้าต่างยืนยันการส่งงานด้วย SweetAlert2 (ธีม Cozy)
     - อัปโหลดไฟล์ตรงเข้า S3 Storage
     - Client แจ้ง Server Action `submitAssignmentAction` บันทึก Metadata ลงฐานข้อมูล
  4. การตรวจ Deadline:
     - ถ้า `submittedAt <= dueDate` -> สถานะ `SUBMITTED`
     - ถ้า `submittedAt > dueDate` -> สถานะ `LATE`

---

### Phase 9 — Teacher Grading Studio (ระบบตรวจงานครู ตัวอย่างงาน ตาราง Rubric และการคำนวณสด)
- **เป้าหมาย**: หน้าตรวจงานระดับมืออาชีพที่แสดงผลงานนักเรียนแบบ Live Preview ควบคู่กับตาราง Rubric และคิดคะแนนสด
- **งานที่ต้องทำ**:
  1. หน้ารายการ Submission ของแต่ละการบ้าน (`/admin/assignments/[id]/submissions`):
     - ดูสถานะการส่ง, วันที่ส่ง, ส่งตรงเวลา/ล่าช้า, คะแนนรวม
  2. **ห้องตรวจงานครู (`/admin/submissions/[id]`) - Split-Screen Layout**:
     - **จอฝั่งซ้าย: Live File Previewer (`SubmissionFilePreviewer.tsx`)**:
       - ตรวจสอบ MIME Type เพื่อเรนเดอร์ตัวอย่างงาน:
         - **PDF**: แสดงผ่าน Interactive PDF Viewer ในตัว พร้อมปุ่มเปิดเต็มจอ
         - **รูปภาพ (JPG, PNG, WebP)**: แสดงภาพขนาดใหญ่ คมชัด และปุ่มซูมขยาย
         - **วิดีโอ/เสียง (MP4, WebM, MP3)**: เครื่องเล่น HTML5 Player ตรวจสอบความถูกต้องของสื่อ
         - **เอกสาร/ไฟล์อื่นๆ**: แสดงรายละเอียดไฟล์ และปุ่มดาวน์โหลดปลอดภัยผ่าน Presigned URL
       - แสดงความคิดเห็นเพิ่มเติมที่นักเรียนส่งมา
     - **จอฝั่งขวา: Interactive Rubric Table (`RubricGradingTable.tsx`)**:
       - ตารางเกณฑ์การให้คะแนน:
         - คอลัมน์ที่ 1: ชื่อเกณฑ์และคำอธิบายเกณฑ์
         - คอลัมน์ที่ 2: คะแนนเต็มของเกณฑ์ (`maxScore`)
         - คอลัมน์ที่ 3: ช่องกรอกคะแนน หรือ Quick-Score Pills (ปุ่มกดเลือกคะแนนได้ทันที)
         - คอลัมน์ที่ 4: ข้อเสนอแนะเฉพาะเกณฑ์
       - **ระบบคำนวณคะแนนแบบ Real-Time**:
         - รวมคะแนนอัตโนมัติทันทีที่ขยับคะแนนในแต่ละเกณฑ์ (`SUM(scores)`)
         - คำนวณเป็นเปอร์เซ็นต์ พร้อม Progress Bar แสดงสีระดับผลคะแนน
         - กล่องกรอกคำติชมและข้อเสนอแนะรวม (Overall Feedback)
  3. **การบันทึกคะแนนด้วย Prisma `$transaction`**:
     - ตรวจสอบคะแนนทุกข้อต้องอยู่ในช่วง `0 <= score <= rubric.maxScore`
     - รวมคะแนนที่ฝั่ง Server อีกชั้น
     - บันทึก `Grade` และ `RubricScore` ใน Transaction เดียวกันอย่างปลอดภัย ปรับสถานะเป็น `GRADED`

---

### Phase 10 — UI & Dashboard ธีม Cozy Yellow + Red "ชุมนุมสื่อสร้างสรรค์"
- **เป้าหมาย**: ปรับแต่ง UI ให้สวยงาม อบอุ่น ใช้งานง่าย และเน้นอัตลักษณ์ของชุมนุมสื่อสร้างสรรค์
- **งานที่ต้องทำ**:
  1. **Palette สี Cozy Yellow + Red**:
     - พื้นหลัง Warm Cream: `#FFF9F0`
     - สีหลัก Warm Golden: `#D9A441`
     - สีรอง Terracotta: `#C96B4B`
     - สีเน้น Warm Red: `#B94E48`
     - ตัวอักษร Warm Brown: `#3F342B`
  2. **Student Dashboard (`/student/dashboard`)**:
     - การ์ดต้อนรับระบุชื่อนักเรียน, ชั้นเรียน, เลขที่ และสังกัด **"ชุมนุมสื่อสร้างสรรค์"**
     - สรุปสถิติ: งานทั้งหมด, ส่งแล้ว, รอตรวจ, ยังไม่ส่ง, คะแนนสะสมรวม
     - การแสดงผล Mobile-First ตอบโจทย์การใช้งานบนสมาร์ตโฟน
  3. **Admin Dashboard (`/admin/dashboard`)**:
     - สรุปภาพรวม: จำนวนสมาชิกชุมนุม, การบ้านทั้งหมด, งานที่เปิดรับส่ง, งานที่รอตรวจ
     - การจัดการรายชื่อนักเรียน (ค้นหา, คัดกรองตามห้อง, เพิ่ม/แก้ไข/ปิดการใช้งาน)
  4. **SweetAlert2 Custom Styling**:
     - ปรับแต่ง Modal, Toast, Confirmation Box ให้เป็นโทนสีอบอุ่น Cozy Yellow/Red

---

### Phase 11 — Security Audit & System Hardening
- **เป้าหมาย**: ทดสอบและปิดช่องโหว่ความปลอดภัยก่อนนำไปใช้งานจริง
- **งานที่ต้องทำ**:
  1. **Route Guard Audit**: ทดสอบนำ Browser ที่ไม่มี Session หรือมี Session นักเรียน เข้าถึง `/admin/*` -> ต้องถูก Proxy ดีดกลับทันที
  2. **Resource Isolation Audit**: ทดสอบนำ Token ของนักเรียน A ไปร้องขอ URL ดูไฟล์ของนักเรียน B -> ต้องได้ 403 Forbidden
  3. **Rubric Tampering Audit**: ทดสอบยิง Request กรอกคะแนนเกินเกณฑ์ หรือแก้ไข Rubric ของงานที่มีการส่งแล้ว -> ต้องถูกบล็อก
  4. **Header Verification**: ตรวจสอบว่า HTTP Responses มี Header: CSP, HSTS, X-Frame-Options ครบถ้วน
  5. **Sensitive Data Audit**: ยืนยันว่าไม่มีการส่ง `passwordHash` หรือ Database Credentials ไปยังหน้า Client

---

### Phase 12 — End-to-End Verification & Walkthrough
- **เป้าหมาย**: ทดสอบโฟลว์การทำงานจริงทั้งหมดตั้งแต่ต้นจนจบ และจัดทำเอกสารสรุป
- **งานที่ต้องทำ**:
  1. เข้าสู่ระบบครู (`admin` / `admin123`)
  2. สร้างการบ้านใหม่ "ออกแบบสื่อสร้างสรรค์" พร้อมเกณฑ์ Rubric 3 ข้อ -> ตรวจสอบผลรวมคะแนน -> ทำการ Publish
  3. สลับไปเข้าสู่ระบบนักเรียน ด้วย รหัส/ห้อง/เลขที่
  4. เปิดดูรายละเอียดงาน เกณฑ์ Rubric และอัปโหลดไฟล์ส่งงานผ่าน Presigned URL
  5. สลับกลับมาที่บัญชีครู เข้าหน้าห้องตรวจงาน (`/admin/submissions/[id]`):
     - **ตรวจสอบ Live File Preview**: ตัวอย่างชิ้นงานนักเรียนปรากฏขึ้นอย่างชัดเจน
     - **ตรวจสอบ Rubric Grading Table**: ทดสอบคลิกให้คะแนนแต่ละข้อ และดูการคำนวณผลรวมคะแนนแบบ Real-time
     - พิมพ์ Feedback และกดบันทึกคะแนน
  6. สลับกลับไปที่บัญชีนักเรียน: ตรวจสอบหน้าคะแนน ดูเกรดและข้อเสนอแนะที่ได้รับ
  7. สรุปผลการพัฒนาและบันทึกลงใน `walkthrough.md`

---

### Phase 13 — Attendance Check-in System with Calendar & Historical Editing ✅ (Completed)
- **เป้าหมาย**: พัฒนาระบบเช็กชื่อกิจกรรมชุมนุม รองรับ Mobile-First Responsive พร้อมปฏิทินแสดงผลและระบบแก้ไขย้อนหลัง
- **ผลลัพธ์ที่ได้**:
  1. **Database Schema & Migration**: สร้าง `AttendanceSession`, `AttendanceRecord` และ enum `AttendanceStatus` พร้อมรัน Migration `20260903143242_add_attendance`
  2. **Mobile-First Responsive Attendance Studio (ครู)**:
     - หน้าสร้าง/แก้ไขรอบกิจกรรม (`/admin/attendance`) เลือกระบุวันที่ได้อิสระ (ทั้งวันนี้และย้อนหลัง)
     - หน้าห้องเช็กชื่อ (`/admin/attendance/[id]`) พร้อมปุ่มลัด "เช็กมาครบทุกคน (Mark All Present)"
     - ปุ่มกด Touch-friendly Pills: `[ มา 🟢 | สาย 🟡 | ลา 🔵 | ขาด 🔴 ]` บนการ์ดมือถือและเดสก์ท็อป
     - ระบบแก้ไขย้อนหลัง (Historical Editing) พร้อมแถบบันทึกผลลอยด้านล่าง (Floating Sticky Save Bar)
     - กรองตามห้องเรียน ค้นหาตามชื่อ/รหัส/เลขที่ และแสดงตัวนับสถิติสด
  3. **Interactive Calendar Attendance View (นักเรียน)**:
     - ปฏิทินรายเดือนภาษาไทย (`/student/attendance`) แสดงจุดสีตามวันที่เช็กชื่อ (🟢 มา, 🟡 สาย, 🔵 ลา, 🔴 ขาด)
     - คลิกวันที่เพื่อดูการ์ดรายละเอียดกิจกรรม หัวข้อ วันที่ สถานะ และหมายเหตุจากอาจารย์
     - แดชบอร์ดสรุปเปอร์เซ็นต์การเข้าเรียนสะสม พร้อมตัวชี้วัดผ่านเกณฑ์กิจกรรม (≥ 80%)
     - โหมดสลับดูแบบรายการประวัติทั้งหมด (List View) พร้อมระบบค้นหา/แบ่งหน้า

---

### Phase 14 — Universal Table Enhancements (Filter, Sort & Pagination) ✅ (Completed)
- **เป้าหมาย**: อัปเกรดทุกตารางข้อมูลในระบบให้มีระบบค้นหา/กรอง, การเรียงลำดับหลายคอลัมน์ และการแบ่งหน้า
- **ผลลัพธ์ที่ได้**:
  1. **Reusable Components**:
     - `TablePagination.tsx`: ปุ่มเปลี่ยนหน้า, หน้าแรก/หน้าสุดท้าย, ตัวเลือกขนาดหน้า (10, 20, 50 รายการ)
     - `SortableTableHeader.tsx`: หัวตารางคลิกเรียงลำดับ Ascending / Descending พร้อมไอคอนลูกศร
  2. **นำไปติดตั้งและทำงานสมบูรณ์ในทุกตารางทั่วทั้งระบบ**:
     - ตารางรายชื่อนักเรียน (`/admin/students`): ค้นหาชื่อ/รหัส, กรองห้อง, เรียงตามเลขที่/รหัส/ชื่อ/คะแนน/งานที่ส่ง, แบ่งหน้า 10/20/50
     - ตารางการบ้านฝั่งครู (`/admin/assignments`): ค้นหา, กรองสถานะ, เรียงตามวันที่สร้าง/กำหนดส่ง/คะแนนเต็ม/จำนวนส่ง, แบ่งหน้า
     - ตารางรายการส่งงานของการบ้าน (`/admin/assignments/[id]/submissions`): กรองห้อง/สถานะ, ค้นหา, เรียงตามเลขที่/รหัส/ชื่อ/คะแนน/เวลาส่ง, แบ่งหน้า
     - ตารางคิวตรวจงาน (`/admin/submissions`): กรองสถานะ/ห้อง/การบ้าน, ค้นหา, เรียงตามเวลาส่ง/เลขที่/คะแนน, แบ่งหน้า
     - ตารางประวัติรอบการเช็กชื่อ (`/admin/attendance`): ค้นหา, กรองภาคเรียน, เรียงตามวันที่/อัตราเข้าเรียน, แบ่งหน้า
     - ตารางภาระงานฝั่งนักเรียน (`/student/assignments`): ค้นหา, กรองสถานะ 5 หมวด, เรียงตามกำหนดส่ง/คะแนน/ชื่อ, แบ่งหน้า
  3. **Verification**: ผ่านการทดสอบ Next.js Production Build (`bun run build`) และ End-to-End Database Flow เรียบร้อย 100%

---

### Phase 15 — Thai Holidays Calendar Integration (`date-holidays`) ✅ (Completed)
- **เป้าหมาย**: แสดงวันหยุดราชการและวันสำคัญของประเทศไทยในรูปแบบภาษาไทยบนปฏิทินของทั้งระบบ โดยใช้ไลบรารี `date-holidays`
- **ผลลัพธ์ที่ได้**:
  1. ติดตั้งไลบรารี `date-holidays@3.36.0`
  2. พัฒนาโมดูล [`src/lib/utils/holidays.ts`](file:///d:/.PHONGPHAT/sssparty/src/lib/utils/holidays.ts) กำหนดคอนฟิก `new Holidays('TH', { languages: ['th'] })`
  3. ติดตั้งในปฏิทินเช็กชื่อฝั่งแอดมิน (`/admin/attendance`):
     - ไฮไลต์ช่องวันหยุดด้วยสีชมพูอ่อน (Rose) และตัวเลขอักษรสีแดงเข้ม พร้อมธง 🚩 และชื่อวันหยุดภาษาไทย (เช่น วันสงกรานต์, วันขึ้นปีใหม่, วันปิยมหาราช)
     - แสดงแถบแจ้งเตือนวันหยุดราชการบนการ์ดรายละเอียดเมื่อคลิกวันที่
     - แจ้งเตือนในกล่องยืนยันการสร้างรอบเช็กชื่อหากวันที่เลือกตรงกับวันหยุด
     - เพิ่มสัญลักษณ์ 🚩 ในคำอธิบายสัญลักษณ์ (Legend)
  4. ติดตั้งในปฏิทินประวัติเข้าเรียนฝั่งนักเรียน (`/student/attendance`):
     - แสดงป้ายกำกับวันหยุดราชการภาษาไทยบนแต่ละวัน
     - แสดงแถบรายละเอียดวันหยุดในการ์ดข้อมูลด้านขวา
     - เพิ่มสัญลักษณ์ใน Legend
  5. **Verification**: ผ่านการทดสอบ Next.js Build (`bun run build`) และ Unit Test ทดสอบความถูกต้องของวันหยุดปี 2026 ทั้ง 18 วัน 100%

---

### Phase 16 — Student Profile Clarification & Password Removal ✅ (Completed)
- **เป้าหมาย**: แก้ไขปัญหาที่นักเรียนไม่มีรหัสผ่านในระบบ (Passwordless) แต่มีฟอร์มถามหารหัสผ่านเดิมทำให้ไม่สามารถตั้งค่าได้ โดยปรับให้ฝั่งนักเรียนเป็นการแก้ไขข้อมูลส่วนตัว (ชื่อ-นามสกุล) โดยตรง และแสดงข้อมูลทะเบียนนักเรียนที่ชัดเจน
- **ผลลัพธ์ที่ได้**:
  1. **ปรับปรุง `StudentProfileForm.tsx`**:
     - นำแท็บ "ความปลอดภัย & รหัสผ่าน" ที่สับสนและไม่มีความจำเป็นออก เนื่องจากนักเรียนล็อกอินด้วย รหัสนักเรียน + ห้อง + เลขที่ (Passwordless Login)
     - ปรับให้ฟอร์มโฟกัสที่การแก้ไขชื่อจริงและนามสกุลโดยตรง พร้อมปุ่มบันทึกการเปลี่ยนแปลง
     - เพิ่มการ์ดแสดงข้อมูลทะเบียนนักเรียน: รหัสนักเรียน, ชั้นเรียน, เลขที่ และสถานะบัญชี (ปกติ) พร้อมคำอธิบายระบบเข้าสู่ระบบแบบไม่ต้องใช้รหัสผ่าน
  2. **ปรับปรุง `src/app/student/profile/page.tsx`**:
     - ส่งข้อมูลทะเบียนนักเรียนเข้าสู่คอมโพเนนต์ฟอร์มโดยตรง
  3. **Verification**: ผ่านการทดสอบ Next.js Production Build (`bun run build`) 0 errors และ Unit Test การอัปเดตข้อมูลนักเรียน 100%

---

### Phase 17 — Universal File Formats Support (Images, PDF, Word, Excel, PPT, Media, ZIP) ✅ (Completed)
- **เป้าหมาย**: ขยายระบบส่งงานให้รองรับไฟล์ทุกรูปแบบที่จำเป็นต่อการเรียนการสอน (รูปภาพ, PDF, Word, Excel, PowerPoint, มัลติมีเดีย, ZIP) พร้อมยกระดับขนาดไฟล์สูงสุดเป็น 50MB และแสดง Preview / Download ที่ออกแบบเฉพาะสำหรับแต่ละประเภทไฟล์
- **ผลลัพธ์ที่ได้**:
  1. **อัปเกรดโมดูลตรวจสอบไฟล์ (`src/lib/s3/file-validator.ts`)**:
     - ขยาย `ALLOWED_EXTENSIONS` และ `ALLOWED_MIME_TYPES` ครอบคลุม:
       - **รูปภาพ**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.svg`, `.heic`, `.heif`
       - **เอกสาร PDF**: `.pdf`
       - **Microsoft Word**: `.docx`, `.doc`, `.odt`, `.rtf`, `.txt`
       - **Microsoft Excel**: `.xlsx`, `.xls`, `.csv`, `.ods`
       - **Microsoft PowerPoint**: `.pptx`, `.ppt`, `.odp`
       - **วิดีโอ & เสียง**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mp3`, `.wav`, `.m4a`
       - **ไฟล์บีบอัด**: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`
     - เพิ่มระบบป้องกันความปลอดภัยขั้นสูง บล็อกไฟล์อันตราย (.exe, .sh, .bat, .php, .js)
     - เพิ่มขนาดไฟล์สูงสุดเป็น 50MB
     - เพิ่มฟังก์ชัน `getFileTypeCategory` จำแนกหมวดหมู่ไฟล์และจัดสี Badge ให้เหมาะสม
  2. **อัปเกรดฟอร์มส่งงานฝั่งนักเรียน (`src/components/student/StudentSubmissionForm.tsx`)**:
     - ปรับ `accept` attribute ของ input file ให้ครอบคลุมทุกนามสกุลข้างต้น
     - แสดงป้ายหมวดหมู่ไฟล์เมื่อเลือกไฟล์ และแสดงสัญลักษณ์ประเภทไฟล์อย่างสวยงามเมื่อส่งงานแล้ว
  3. **อัปเกรดเครื่องมือตรวจงานฝั่งครู (`src/components/admin/SubmissionFilePreviewer.tsx`)**:
     - มีการ์ดและปุ่มดาวน์โหลด/เปิดดูเฉพาะสำหรับ Word, Excel, PowerPoint พร้อมลิงก์เปิดดูออนไลน์ผ่าน Google Docs / Sheets / Slides Viewer
     - ตัวเล่น PDF, วิดีโอ HTML5, ตัวเล่นเสียง และโปรแกรมดูรูปภาพแบบขยาย/หมุนภาพได้
  4. **Verification**: Next.js Production Build (`bun run build`) ผ่าน 100% (Zero Errors) และ Unit Test ครอบคลุมไฟล์ทุกประเภท 100%

---

### Phase 18 — Graceful File Preview Fallback & Direct Download ✅ (Completed)
- **เป้าหมาย**: ในกรณีที่ไฟล์ใดไม่สามารถแสดงผลหรือพรีวิวได้โดยตรงในเบราว์เซอร์ ให้ระบบแสดงกล่องแจ้งเตือนพร้อมปุ่มดาวน์โหลดไฟล์ขนาดใหญ่ที่สังเกตเห็นได้ชัดเจนทันที
- **ผลลัพธ์ที่ได้**:
  1. **หน้าห้องตรวจงานของครู (`src/components/admin/SubmissionFilePreviewer.tsx`)**:
     - เพิ่มตัวจับข้อผิดพลาด `onError` ของการโหลดรูปภาพ วิดีโอ และเสียง
     - ในกรณีที่พรีวิวไม่สำเร็จ ระบบจะสลับหน้าจอเป็น Fallback View อัตโนมัติ แสดงข้อความ *"เบราว์เซอร์ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้โดยตรง"* พร้อมปุ่ม **"ดาวน์โหลดไฟล์นี้เพื่อเปิดตรวจ"** และปุ่มลองโหลดใหม่
     - มีแถบเตือนด้านล่างเอกสาร PDF แนะนำให้คลิกดาวน์โหลดหากเบราว์เซอร์ไม่แสดงตัวอย่าง
     - เพิ่มปุ่มดาวน์โหลดไฟล์ลงเครื่องในแถบเครื่องมือด้านบนตลอดเวลา
  2. **หน้าส่งงานฝั่งนักเรียน (`src/components/student/StudentSubmissionForm.tsx`)**:
     - เพิ่มปุ่ม **"ดาวน์โหลด"** แบบ Direct Attachment (`/api/files/.../?download=1`) คู่กับปุ่ม "เปิดดูไฟล์" เสมอ
     - หากฟังก์ชันเปิดดูไฟล์ในแท็บใหม่ถูกบล็อกหรือมีข้อผิดพลาด ระบบจะสลับมาเปิดกล่องดาวน์โหลดไฟล์อัตโนมัติ
  3. **Verification**: Next.js Production Build (`bun run build`) ผ่านครบทั้ง 18 Route 100%

---

### Phase 19 — Flexible Assignments, Rich Markdown Editor, Attachments, Per-Question Images & Draft Submissions ✅ (Completed)
- **เป้าหมาย**:
  1. รองรับรูปแบบการส่งงาน 3 ประเภท: แบบไฟล์ (FILE), แบบลิงก์ภายนอก (LINK), และแบบตอบคำถามหลายข้อ (QUESTIONS)
  2. เพิ่มเครื่องมือจัดรูปแบบคำสั่งงาน Markdown สไตล์โปรแกรม Word (หัวข้อตัวใหญ่/เล็ก, ตัวหนา, ตัวเอียง, รายการ, ตาราง, กล่องข้อความ) พร้อมแถบพรีวิวสด
  3. คุณครูสามารถอัปโหลดไฟล์/รูปภาพประกอบโจทย์ให้นักเรียนดูได้หลายไฟล์
  4. แต่ละข้อคำถามสามารถแนบรูปภาพโจทย์เฉพาะข้อได้ (Per-Question Image Attachment)
  5. ระบบบันทึกแบบร่าง (Draft Submissions) ให้นักเรียนบันทึกความคืบหน้าไว้ก่อนได้ โดยคุณครูสามารถเปิดดูไฟล์หรือคำตอบในแบบร่างได้ แต่ระบบจะล็อกการให้คะแนนไว้จนกว่านักเรียนจะกดยืนยันส่งงาน (Turn In)
- **ผลลัพธ์ที่ได้**:
  1. **ฐานข้อมูลและการ Migrate**:
     - เพิ่ม `enum SubmissionType { FILE, LINK, QUESTIONS }`
     - เพิ่ม `DRAFT` ใน `enum SubmissionStatus`
     - สร้างตาราง `assignment_attachments`, `assignment_questions`, `question_answers`
     - ปรับ `submissions` ให้รองรับ `submissionType`, `linkUrl` และคำตอบ `answers`
  2. **คอมโพเนนต์ Markdown และ Rich UI**:
     - `MarkdownViewer.tsx`: แสดงผล Markdown ด้วย Typography สไตล์ Cozy อบอุ่น
     - `MarkdownEditor.tsx`: แถบเครื่องมือเสมือน Word สำหรับจัดฟอร์แมต Markdown พร้อมโหมดพรีวิว
     - `TeacherAttachmentUploader.tsx`: อัปโหลดเอกสารและรูปภาพประกอบโจทย์ของคุณครู
     - `QuestionBuilder.tsx`: เครื่องมือสร้างคำถามหลายข้อ พร้อมอัปโหลดรูปภาพประกอบโจทย์เฉพาะข้อและสลับลำดับข้อได้
  3. **หน้าจอครูและระบบป้องกันการให้คะแนน**:
     - `/admin/assignments/new` & `[id]/edit`: รองรับการเลือกประเภทการส่งงาน, แนบไฟล์โจทย์, พิมพ์คำสั่ง Markdown, และสร้างคำถามพร้อมรูป
     - `/admin/submissions/[id]`: แสดงตัวอย่างผลงานตามประเภท (ไฟล์ / ลิงก์ / คำถาม-คำตอบพร้อมรูปโจทย์) และแสดงป้ายสถานะแบบร่าง (Draft)
     - `RubricGradingTable.tsx` & `src/actions/grade.ts`: แสดงแบนเนอร์แจ้งเตือนและล็อกการกรอกคะแนน/บันทึกคะแนนหากงานยังอยู่ในสถานะแบบร่าง (DRAFT)
  4. **หน้าจอนักเรียน**:
     - `/student/assignments/[id]`: แสดงคำสั่ง Markdown อย่างสวยงาม, แสดงรายการไฟล์/รูปภาพประกอบโจทย์ของคุณครู
     - `StudentSubmissionForm.tsx`: สลับแบบฟอร์มตามประเภท (อัปโหลดไฟล์ / กรอกลิงก์ / ตอบคำถามแต่ละข้อพร้อมแสดงรูปโจทย์) พร้อมปุ่มคู่ **"💾 บันทึกแบบร่าง (Save Draft)"** และ **"🚀 ยืนยันส่งงาน (Turn In)"**
  5. **การทดสอบ**:
     - Next.js Production Build (`bun run build`) ผ่าน 100% ครบทั้ง 18 Route ไร้ข้อผิดพลาด
     - E2E Test (`test-flexible-assignments-flow.ts`) ทดสอบการสร้างงาน, แนบไฟล์, ใส่คำถามพร้อมรูป, บันทึกแบบร่าง, ตรวจสอบการล็อกให้คะแนนแบบร่าง, การกดยืนยันส่งงาน, และการให้คะแนนผลงานจริง สำเร็จ 100%

---

### Phase 20 — Production Readiness & Authentication UI Hardening ✅ (Completed)
- **เป้าหมาย**:
  1. นำ Auto-fill และ Default Values ออกจากหน้าล็อกอินครู และเปลี่ยน Placeholder ให้เป็นกลางและปลอดภัย
  2. ลบกล่องข้อมูลบัญชีตัวอย่างทดสอบออกจากหน้าจอล็อกอินนักเรียน
  3. บังคับใช้ความปลอดภัยของ `JWT_SECRET` ในโหมด Production (ปฏิเสธ Fallback Secret)
  4. ตั้งค่า Next.js Standalone Build และปิด Header `X-Powered-By: Next.js`
  5. สร้าง Multi-stage `Dockerfile`, `.dockerignore`, และ `docker-compose.yml`
  6. ปรับแต่ง Database Connection Pool ให้ตรวจจับและรองรับ SSL Cloud Database (Supabase, Neon, RDS) อัตโนมัติ
  7. สร้าง Healthcheck Endpoint `/api/health` สำหรับตรวจสอบสถานะระบบและฐานข้อมูล
  8. จัดทำคู่มือการ Deploy บนเซิร์ฟเวอร์จริง `DEPLOYMENT.md` และอัปเดต `.env.example`
- **ผลลัพธ์ที่ได้**:
  1. **หน้าล็อกอินครู (`src/app/admin-login/page.tsx`)**: ลบ `defaultValue="admin"` และ `defaultValue="admin123"` ออกทั้งหมด, เปลี่ยน Placeholder เป็น `"กรอกชื่อผู้ใช้งาน"` และ `"กรอกรหัสผ่าน"`, เพิ่ม `autoComplete="username"` และ `autoComplete="current-password"`
  2. **หน้าล็อกอินนักเรียน (`src/app/student-login/page.tsx`)**: ลบกล่องคำแนะนำบัญชีทดสอบออกทั้งหมด, ปรับ Placeholder ให้กระชับ ปลอดภัย และเพิ่ม `autoComplete="off"`
  3. **ความปลอดภัยระบบยืนยันตัวตน (`src/lib/auth/jwt.ts`)**: ในโหมด `NODE_ENV === "production"` มี Guard บังคับว่าต้องมี `JWT_SECRET` ที่มีความยาวอย่างน้อย 32 ตัวอักษรและห้ามใช้ Fallback Secret
  4. **การเชื่อมต่อฐานข้อมูล (`src/lib/prisma/client.ts`)**: รองรับ SSL อัตโนมัติสำหรับ Managed Cloud Postgres และตั้งค่า `DB_POOL_MAX` ผ่าน Environment ได้
  5. **การตั้งค่า Next.js Standalone (`next.config.ts`)**: เพิ่ม `output: "standalone"` และ `poweredByHeader: false`
  6. **การสร้าง Container**: สร้าง `Dockerfile` แบบ 3-Stage (Base -> Builder -> Runner) รันเป็น Non-root User พร้อมตรวจจับ Healthcheck และสร้าง `docker-compose.yml`
  7. **Health Monitoring (`/api/health`)**: ส่งสถานะ HTTP 200 พร้อม Latency เมื่อฐานข้อมูลเชื่อมต่อสมบูรณ์
  8. **การทดสอบ**: Standalone Build ผ่าน 100%, Healthcheck คืนค่า 200 Healthy พร้อมข้อมูลฐานข้อมูลครบถ้วน

---

### Phase 21 — Switchable Attendance View Modes (Table View vs Card View) ✅ (Completed)
- **เป้าหมาย**:
  1. ในหน้าเช็กชื่อของครู ปลดล็อกการบังคับแสดงผลแบบการ์ดเฉพาะมือถือหรือตารางเฉพาะเดสก์ท็อป
  2. เพิ่มปุ่มสลับมุมมองให้ผู้ใช้เลือกได้ตามต้องการว่าต้องการดูแบบ **"แบบตาราง (Table View)"** หรือ **"แบบการ์ด (Card View)"**
  3. บันทึกตัวเลือกมุมมองล่าสุดลงใน `localStorage` เพื่อจดจำรูปแบบที่ผู้ใช้ชื่นชอบ
- **ผลลัพธ์ที่ได้**:
  1. **คอมโพเนนต์เช็กชื่อ (`src/components/admin/AttendanceSheetClient.tsx`)**:
     - เพิ่มสถานะ `viewMode: "table" | "card"` พร้อมซิงค์กับ `localStorage`
     - เพิ่มปุ่ม Toggle สลับมุมมองที่แถบค้นหาและกรองข้อมูล
     - ในโหมด **แบบตาราง (Table)**: แสดงตารางข้อมูลนักเรียนพร้อมหัวตารางที่กดเรียงลำดับได้ (Sortable), แถบปุ่มสถานะ มา/สาย/ลา/ขาด, และช่องหมายเหตุ รองรับการเลื่อนแนวนอนบนหน้าจอมือถือ
     - ในโหมด **แบบการ์ด (Card)**: แสดงการ์ดข้อมูลแบบ Responsive Grid (1 คอลัมน์บนมือถือ, 2 คอลัมน์บนแท็บเล็ต, 3 คอลัมน์บนจอใหญ่) ใช้งานง่ายด้วยปุ่มสัมผัสขนาดใหญ่
  2. **การทดสอบ**: Next.js Production Build (`bun run build`) ผ่าน 100% ไร้ข้อผิดพลาด







