# Prompt — ระบบส่งงานชุมนุมแบบ Classroom

สร้างเว็บแอปพลิเคชัน **ระบบส่งงานสำหรับชุมนุม/โรงเรียน** คล้าย Google Classroom แต่เป็นระบบขนาดเล็ก ใช้งานง่าย และเน้นให้สามารถพัฒนาต่อในอนาคตได้

ระบบต้องเน้น UX ที่ดี ใช้งานง่ายบนมือถือ และมี UI สวยงามในธีม Cozy Yellow + Red

---

# 1. Technology Stack

ใช้เทคโนโลยีดังต่อไปนี้

- Next.js 16+ App Router
- TypeScript
- Prisma ORM 7
- PostgreSQL
- Tailwind CSS
- Material Tailwind
- SweetAlert2
- Zod
- S3-compatible Object Storage
- S3 Presigned URL

## สำคัญมากเกี่ยวกับ Prisma

ฉันจะเป็นผู้ติดตั้งและตั้งค่า Prisma 7 ให้เอง

**ห้ามติดตั้ง Prisma ใหม่**
**ห้ามเปลี่ยน Version ของ Prisma**
**ห้ามเปลี่ยน Prisma Configuration ที่ฉันเตรียมไว้โดยไม่จำเป็น**

ก่อนแก้ไขหรือสร้าง Prisma Schema ให้ศึกษาวิธีใช้งาน Prisma ORM 7 จาก Official Documentation ก่อนเสมอ

ต้องใช้ Syntax และแนวทางของ Prisma 7 เท่านั้น ห้ามนำตัวอย่าง Prisma 5/6 มาใช้โดยไม่ตรวจสอบว่าเข้ากันได้กับ Prisma 7

Prisma 7 ใช้ `prisma.config.ts` สำหรับการตั้งค่า Prisma CLI และ Database Connection ตาม Documentation ปัจจุบัน

---

# 2. กฎเกี่ยวกับ Database

ฉันต้องการใช้ **Prisma Migrate เท่านั้น**

ห้ามใช้

```bash
prisma db push
```

โดยเด็ดขาด

ห้ามสร้าง Database Schema ด้วยการใช้ `db push`

ห้ามแก้ Database โดยตรงด้วย SQL หากไม่จำเป็น

Schema ต้องถูกออกแบบใน

```text
prisma/schema.prisma
```

และใช้ Migration

Development:

```bash
prisma migrate dev
```

Production:

```bash
prisma migrate deploy
```

Prisma 7 แยกหน้าที่ของคำสั่ง Migration อย่างชัดเจน ดังนั้นต้องปฏิบัติตาม Documentation ของ Prisma 7

---

# 3. สิ่งที่ AI Agent ต้องทำเกี่ยวกับ Migration

เมื่อออกแบบ Database เสร็จแล้ว

1. สร้าง `schema.prisma`
2. ตรวจสอบ Relation
3. ตรวจสอบ Constraint
4. ตรวจสอบ Enum
5. ตรวจสอบ Index
6. ตรวจสอบว่ารวมคะแนน Rubric ถูกต้องตาม Business Logic
7. สร้าง Migration

ตัวอย่าง:

```bash
prisma migrate dev --name init
```

หาก Migration ต้องการ Reset Database หรือ Prisma แจ้งว่าจะ Reset Database

**ห้ามดำเนินการต่อ**

ให้หยุดและแจ้งฉันก่อน

ห้ามใช้

```bash
prisma migrate reset
```

โดยไม่ได้รับอนุญาต

ห้ามใช้

```bash
prisma db push
```

ทุกกรณี

---

# 4. Prisma 7 Configuration

ฉันจะจัดการการติดตั้ง Prisma ให้เอง

AI Agent ต้องอ่านและทำงานให้สอดคล้องกับ Prisma 7

โปรเจกต์อาจมีโครงสร้างประมาณ

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.ts

prisma.config.ts
```

ห้ามนำวิธีตั้งค่า Prisma แบบ Prisma 6 หรือต่ำกว่ามาใช้โดยไม่ตรวจสอบ

Prisma 7 ต้องใช้ `prisma.config.ts` สำหรับ Prisma CLI Configuration ตาม Official Documentation

---

# 5. Database Architecture

ออกแบบ Database สำหรับระบบดังนี้

```text
User
 │
 └── Student

User
 │
 └── Admin

Assignment
 │
 ├── AssignmentRubric
 │
 └── Submission
        │
        └── Grade
               │
               └── RubricScore
```

ตารางหลัก

```text
User
Student
Assignment
AssignmentRubric
Submission
Grade
RubricScore
```

---

# 6. User

ใช้สำหรับ Authentication ของระบบ

ข้อมูลหลัก

```text
id
username
passwordHash
role
status
createdAt
updatedAt
```

Role

```text
STUDENT
ADMIN
```

Status

```text
ACTIVE
INACTIVE
```

Admin ใช้ Username + Password

Student ไม่จำเป็นต้องมี Password ใน MVP

---

# 7. Student

ข้อมูล

```text
id
userId
studentCode
firstName
lastName
className
studentNumber
status
createdAt
updatedAt
```

ตัวอย่าง

```text
รหัสนักเรียน : 65012345
ชื่อ          : พงษ์ภัทร
นามสกุล       : เภสัชชะ
ชั้น          : ม.6/1
เลขที่         : 12
```

ต้องมี Unique ที่เหมาะสม เช่น

```text
studentCode
```

และพิจารณา Unique Combination

```text
className + studentNumber
```

ตามความเหมาะสมของระบบ

---

# 8. Student Login

นักเรียน Login ด้วย

```text
รหัสนักเรียน
ชั้น
เลขที่
```

ระบบต้องค้นหา Student ที่ข้อมูลทั้งสามตรงกัน

```text
studentCode
className
studentNumber
```

หากถูกต้อง

```text
Login Success
↓
Student Dashboard
```

หากผิด

ใช้ SweetAlert2

```text
เข้าสู่ระบบไม่สำเร็จ
กรุณาตรวจสอบข้อมูลอีกครั้ง
```

---

# 9. Admin Login

Admin Login ด้วย

```text
Username
Password
```

Password ต้องเก็บเป็น Hash

ห้ามเก็บ Plain Text

---

# 10. Assignment

Assignment ต้องมี

```text
id
title
description
maxScore
dueDate
status
createdBy
createdAt
updatedAt
```

Status

```text
DRAFT
PUBLISHED
CLOSED
```

---

# 11. Assignment Rubric

**สำคัญมาก**

เกณฑ์การให้คะแนนต้องถูกกำหนด **ตั้งแต่ตอนสร้าง Assignment**

ไม่อนุญาตให้สร้าง Assignment โดยไม่มี Rubric

ตัวอย่าง

```text
Assignment
รายงานกิจกรรมชุมนุม

คะแนนเต็ม
20 คะแนน

Rubric

1. เนื้อหาครบถ้วน
8 คะแนน

2. ความถูกต้อง
5 คะแนน

3. ความเรียบร้อย
4 คะแนน

4. ส่งตรงเวลา
3 คะแนน
```

รวม

```text
8 + 5 + 4 + 3 = 20
```

ระบบต้องตรวจสอบว่า

```text
SUM(AssignmentRubric.maxScore)
=
Assignment.maxScore
```

หากไม่เท่ากัน

ห้ามสร้าง Assignment

---

# 12. AssignmentRubric

ข้อมูล

```text
id
assignmentId
name
description
maxScore
sortOrder
createdAt
```

`sortOrder` ใช้สำหรับควบคุมลำดับของเกณฑ์

ตัวอย่าง

```text
1 เนื้อหา
2 ความถูกต้อง
3 ความเรียบร้อย
4 การส่งตรงเวลา
```

---

# 13. สร้าง Assignment

หน้า Create Assignment ต้องทำทุกอย่างในหน้าเดียว

```text
ชื่อการบ้าน
รายละเอียด
กำหนดส่ง
คะแนนเต็ม
ไฟล์ประกอบ
เกณฑ์การให้คะแนน
สถานะ
```

ส่วน Rubric ต้องสามารถเพิ่ม/ลบรายการได้ก่อนสร้างงาน

ตัวอย่าง UI

```text
┌─────────────────────────────┐
│ สร้างงาน                    │
├─────────────────────────────┤
│ ชื่องาน                     │
│ [ รายงานกิจกรรม ]           │
│                             │
│ รายละเอียด                  │
│ [.........................] │
│                             │
│ กำหนดส่ง                    │
│ [ 10/09/2569 23:59 ]        │
│                             │
│ คะแนนเต็ม                   │
│ [ 20 ]                      │
│                             │
│ เกณฑ์การให้คะแนน            │
│                             │
│ เนื้อหาครบถ้วน              │
│ คะแนน [ 8 ]                 │
│                             │
│ ความถูกต้อง                 │
│ คะแนน [ 5 ]                 │
│                             │
│ ความเรียบร้อย               │
│ คะแนน [ 4 ]                 │
│                             │
│ ส่งตรงเวลา                  │
│ คะแนน [ 3 ]                 │
│                             │
│ รวม 20 / 20 ✓               │
│                             │
│ [ + เพิ่มเกณฑ์ ]            │
│                             │
│ [ สร้างงาน ]                │
└─────────────────────────────┘
```

---

# 14. การ Lock Rubric

เมื่อ Assignment มี Submission แล้ว

ห้ามแก้ไขหรือลบ Rubric

เพื่อป้องกันปัญหาคะแนนของนักเรียนเปลี่ยนแปลงย้อนหลัง

Business Rule:

```text
Assignment มี Submission
        ↓
Lock Rubric
```

ถ้ายังไม่มี Submission สามารถแก้ไข Rubric ได้

---

# 15. ระบบ Upload File

ไฟล์งานทั้งหมดต้องเก็บบน **S3-compatible Object Storage**

ห้ามส่งไฟล์ขนาดใหญ่ผ่าน Next.js Server โดยตรงถ้าไม่จำเป็น

ให้ใช้

```text
S3 Presigned URL
```

สำหรับ Upload และ Download

Architecture:

```text
Browser
   │
   │ ขอ Presigned URL
   ▼
Next.js Server
   │
   │ Generate Presigned URL
   ▼
S3 Storage
   │
   │ Presigned URL
   ▼
Browser
   │
   │ Upload โดยตรง
   ▼
S3
```

---

# 16. S3 Upload Flow

เมื่อนักเรียนเลือกไฟล์

```text
1. Client ตรวจสอบ File
        ↓
2. ส่ง Metadata ไป Server
        ↓
3. Server ตรวจสอบ Authentication
        ↓
4. Server ตรวจสอบ Assignment
        ↓
5. Server Generate Presigned PUT URL
        ↓
6. Client Upload File ไป S3 โดยตรง
        ↓
7. Upload สำเร็จ
        ↓
8. Client แจ้ง Server
        ↓
9. Server บันทึก File Metadata
```

ห้ามให้ Client เป็นผู้กำหนด Object Key ตามใจ

Server ต้องเป็นผู้สร้าง Object Key

ตัวอย่าง

```text
assignments/{assignmentId}/submissions/{studentId}/{uuid}.pdf
```

หรือโครงสร้างที่เหมาะสมกว่า

---

# 17. File Metadata

Submission ต้องเก็บเฉพาะข้อมูลที่จำเป็น

เช่น

```text
fileKey
fileName
fileSize
mimeType
```

ไม่จำเป็นต้องเก็บไฟล์ Binary ใน PostgreSQL

Database เก็บ Metadata

S3 เก็บ File จริง

---

# 18. Presigned Download

เวลานักเรียนหรือ Admin ต้องเปิดไฟล์

ห้ามเปิด S3 Object แบบ Public หากไม่จำเป็น

ให้ใช้

```text
Presigned GET URL
```

Flow:

```text
User
 ↓
Next.js
 ↓
ตรวจสอบ Permission
 ↓
Generate Presigned GET URL
 ↓
User เปิดไฟล์
```

---

# 19. Security ของ S3

S3 Bucket ควรเป็น Private

ห้ามเปิด Public Bucket สำหรับไฟล์งานนักเรียน

Server ต้องตรวจสอบก่อน Generate Presigned URL

ตัวอย่าง

```text
Student A
    ↓
ขอไฟล์ของ Student B
    ↓
ตรวจสอบ Ownership
    ↓
DENY
```

Admin สามารถเปิดไฟล์ Submission ของนักเรียนได้

Student เปิดได้เฉพาะไฟล์ของตัวเอง

---

# 20. Submission

ข้อมูล

```text
id
assignmentId
studentId
fileKey
fileName
fileSize
mimeType
comment
submittedAt
status
createdAt
updatedAt
```

Status

```text
SUBMITTED
LATE
GRADED
```

ต้องมี Unique ที่เหมาะสมเพื่อป้องกัน Submission ซ้ำ เช่น

```text
assignmentId + studentId
```

MVP ให้ 1 นักเรียนมี Submission หลักต่อ Assignment

หากต้องการแก้ไขงานในอนาคต ค่อยเพิ่ม Versioning

---

# 21. ตรวจ Deadline

เมื่อ Submit

```text
submittedAt <= dueDate
```

ให้

```text
SUBMITTED
```

หาก

```text
submittedAt > dueDate
```

ให้

```text
LATE
```

ไม่ต้องหักคะแนนอัตโนมัติใน MVP

หากต้องการให้ "ส่งตรงเวลา" เป็น Rubric

ให้ Admin เป็นผู้ให้คะแนนตาม Rubric ที่สร้างไว้

---

# 22. Grade

Admin ตรวจ Submission

ข้อมูล

```text
id
submissionId
score
feedback
gradedBy
gradedAt
createdAt
updatedAt
```

คะแนนรวมมาจาก RubricScore

ไม่ให้ Admin กรอกคะแนนรวมโดยตรงเป็นหลัก

---

# 23. RubricScore

ข้อมูล

```text
id
gradeId
rubricId
score
```

ตัวอย่าง

```text
เนื้อหาครบถ้วน
7 / 8

ความถูกต้อง
5 / 5

ความเรียบร้อย
3 / 4

ส่งตรงเวลา
3 / 3
```

ระบบคำนวณ

```text
7 + 5 + 3 + 3
=
18
```

ดังนั้น

```text
Grade.score = 18
```

---

# 24. ตรวจสอบคะแนน

ห้ามกรอกคะแนนเกินคะแนนเต็มของ Rubric

เช่น

```text
Rubric = 8

Score = 9
```

ต้อง Reject

ต้องตรวจสอบฝั่ง Server ด้วย

ไม่ใช่ตรวจเฉพาะ Client

---

# 25. Student Dashboard

แสดง

```text
สวัสดี พงษ์ภัทร 👋

ม.6/1
เลขที่ 12
```

Summary

```text
งานทั้งหมด
8

ส่งแล้ว
6

รอตรวจ
1

ยังไม่ส่ง
1

คะแนนรวม
82 / 100
```

---

# 26. Assignment List

แสดง Card

```text
รายงานกิจกรรมชุมนุม

กำหนดส่ง
10 กันยายน 2569

20 คะแนน

สถานะ
ส่งแล้ว
```

สถานะ

```text
ยังไม่ส่ง
รอตรวจ
ตรวจแล้ว
ส่งล่าช้า
```

---

# 27. Assignment Detail

นักเรียนสามารถดู

```text
ชื่อ
รายละเอียด
กำหนดส่ง
คะแนนเต็ม
Rubric
ไฟล์ประกอบ
สถานะ Submission
```

Rubric แสดงเป็น Read-only

นักเรียนไม่มีสิทธิ์แก้ไข Rubric

---

# 28. Student Submit

หน้า Submit

```text
เลือกไฟล์
[ เลือกไฟล์ ]

ความคิดเห็นเพิ่มเติม
[........................]

[ ส่งงาน ]
```

เมื่อกดส่ง

ใช้ SweetAlert2

```text
ยืนยันการส่งงานหรือไม่?

[ ยกเลิก ] [ ยืนยัน ]
```

จากนั้น Upload ผ่าน S3 Presigned URL

---

# 29. Admin Dashboard

แสดง

```text
นักเรียนทั้งหมด
35 คน

งานทั้งหมด
8 งาน

งานที่เปิดรับส่ง
3 งาน

งานรอตรวจ
12 รายการ
```

---

# 30. Admin Assignment Management

สามารถ

- สร้างงาน
- แก้ไขงาน
- Publish
- Close
- ดูจำนวนผู้ส่ง
- ดูจำนวนคนที่ยังไม่ส่ง

ตัวอย่าง

```text
รายงานกิจกรรม

ส่งแล้ว 30 / 35
รอตรวจ 12
ตรวจแล้ว 18
ยังไม่ส่ง 5
```

---

# 31. Admin ตรวจงาน

หน้า

```text
Submissions
```

แสดง

```text
นักเรียน
สถานะ
วันที่ส่ง
คะแนน
Action
```

เมื่อเปิด

```text
ไฟล์งาน
[ เปิดไฟล์ ]

Rubric

เนื้อหาครบถ้วน
[ 7 ] / 8

ความถูกต้อง
[ 5 ] / 5

ความเรียบร้อย
[ 3 ] / 4

ส่งตรงเวลา
[ 3 ] / 3

────────────────

รวม
18 / 20

Feedback
[.........................]

[ บันทึกคะแนน ]
```

---

# 32. Student Grade

นักเรียนเห็น

```text
รายงานกิจกรรม

18 / 20
```

เมื่อเปิดรายละเอียด

```text
เนื้อหาครบถ้วน     7 / 8
ความถูกต้อง        5 / 5
ความเรียบร้อย      3 / 4
ส่งตรงเวลา         3 / 3

รวม                18 / 20

Feedback

ทำได้ดีมาก
```

---

# 33. Admin Student Management

Admin สามารถ

- เพิ่มนักเรียน
- แก้ไขนักเรียน
- ปิดการใช้งาน
- ค้นหา
- Filter ตามชั้น

ไม่ต้องทำระบบ Import Excel ใน MVP แรก

สามารถเพิ่มภายหลังได้

---

# 34. Authentication Security

ใช้ Authentication ที่เหมาะสมกับ Next.js

ต้องตรวจสอบ Session ฝั่ง Server

ห้ามเชื่อข้อมูล User ID จาก Client

ทุก Protected Route ต้องตรวจสอบ Authentication

Authorization:

```text
STUDENT
→ Student pages เท่านั้น

ADMIN
→ Admin pages
```

Student ห้ามเข้าหน้า Admin

Admin สามารถดู Submission ของนักเรียนได้

Student สามารถดูเฉพาะข้อมูลของตัวเอง

---

# 35. API / Server Action Security

ทุก Mutation ต้องตรวจสอบ

```text
Authentication
Authorization
Input Validation
Resource Ownership
Business Rules
```

ตัวอย่าง

Student ส่งงาน:

```text
ตรวจว่า Login แล้ว
↓
ตรวจว่าเป็น Student
↓
ตรวจ Assignment
↓
ตรวจ Assignment ยังเปิด
↓
ตรวจ Student มีสิทธิ์
↓
ตรวจ File
↓
Upload
↓
สร้าง Submission
```

---

# 36. Zod

ใช้ Zod ตรวจสอบ Input

Assignment:

```text
title
description
maxScore
dueDate
rubrics
```

Rubric:

```text
name
description
maxScore
```

Submission:

```text
fileName
fileSize
mimeType
comment
```

Grade:

```text
rubricScores
feedback
```

Validation ต้องทำฝั่ง Server เสมอ

---

# 37. File Validation

จำกัด

- File Size
- MIME Type
- Extension

ตัวอย่าง MVP อาจรองรับ

```text
PDF
DOC
DOCX
PPT
PPTX
XLS
XLSX
ZIP
PNG
JPG
JPEG
```

กำหนด Maximum File Size เป็น Configuration

เช่น

```text
MAX_UPLOAD_SIZE=20MB
```

อย่า Hard-code ในหลายจุด

---

# 38. Cozy UI

Design ต้องดู

**Cozy / Warm / Modern / Clean**

ห้ามใช้

- สีเหลืองสด
- สีแดงสด
- Gradient เยอะ
- Shadow หนัก
- UI แน่น
- Animation มากเกินไป

ใช้สีแนว

```text
Cream
Warm White
Muted Yellow
Golden
Terracotta
Warm Red
Brown
```

ตัวอย่าง

```text
Background
#FFF9F0

Primary
#D9A441

Secondary
#C96B4B

Accent
#B94E48

Text
#3F342B
```

สามารถปรับสีให้เหมาะสมได้

---

# 39. Material Tailwind

ใช้ Material Tailwind สำหรับ Component ที่เหมาะสม เช่น

- Button
- Input
- Select
- Card
- Dialog
- Drawer
- Tabs
- Badge
- Progress
- Table

แต่ไม่จำเป็นต้องใช้ทุก Component

ต้องรักษา Visual Consistency

---

# 40. SweetAlert2

ใช้ SweetAlert2 สำหรับ

- Login Error
- Confirm Submit
- Confirm Delete
- Confirm Close Assignment
- Save Success
- Save Error
- Logout
- Important Actions

ห้ามใช้

```javascript
alert()
confirm()
```

---

# 41. Responsive

ต้องรองรับ

```text
Mobile
Tablet
Desktop
```

Student UI ต้องให้ความสำคัญกับ Mobile เป็นพิเศษ

Admin สามารถออกแบบ Desktop-first แต่ต้อง Responsive

---

# 42. Project Structure

ออกแบบประมาณนี้

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── student-login/
│   │   └── admin-login/
│   │
│   ├── student/
│   │   ├── dashboard/
│   │   ├── assignments/
│   │   └── grades/
│   │
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── assignments/
│   │   ├── submissions/
│   │   └── grades/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── student/
│   ├── admin/
│   ├── assignments/
│   └── submissions/
│
├── lib/
│   ├── auth/
│   ├── prisma/
│   ├── s3/
│   ├── validation/
│   └── utils/
│
└── generated/
    └── prisma/
```

ปรับได้ตามความเหมาะสมของ Next.js 16 และ Prisma 7

---

# 43. S3 Service

สร้าง Service แยกออกมา

```text
lib/s3/
├── client.ts
├── presigned.ts
└── types.ts
```

ตัวอย่าง Responsibility

```text
createUploadPresignedUrl()
createDownloadPresignedUrl()
deleteObject()
```

ไม่ควรเขียน S3 Logic กระจายอยู่ใน Components

---

# 44. Environment Variables

ออกแบบให้รองรับ

```text
DATABASE_URL

S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
```

ถ้าต้องใช้ Public URL หรือ CDN ให้แยก Configuration

```text
S3_PUBLIC_ENDPOINT
```

แต่ไฟล์งานต้องยังคง Private และใช้ Presigned URL

ห้าม Commit `.env`

---

# 45. Database Constraints

ต้องออกแบบ Constraint ให้ช่วยป้องกันข้อมูลผิด

เช่น

```text
User.username UNIQUE

Student.studentCode UNIQUE

Submission
UNIQUE(assignmentId, studentId)
```

และ Foreign Key ที่เหมาะสม

---

# 46. Index

สร้าง Index สำหรับข้อมูลที่ค้นหาบ่อย

เช่น

```text
studentCode
className
assignmentId
studentId
status
dueDate
```

อย่าสร้าง Index ทุก Column โดยไม่จำเป็น

---

# 47. Business Rules สำคัญ

## Assignment

```text
คะแนนเต็ม > 0

Rubric อย่างน้อย 1 รายการ

ผลรวม Rubric = คะแนนเต็ม
```

## Submission

```text
Assignment ต้อง PUBLISHED

Student ต้อง ACTIVE

1 Student มี Submission หลัก 1 รายการต่อ Assignment
```

## Grade

```text
คะแนน Rubric >= 0

คะแนน Rubric <= maxScore

คะแนนรวม = SUM(RubricScore)
```

## Rubric

```text
เมื่อมี Submission แล้ว
ห้ามแก้ไข Rubric
```

---

# 48. Seed Data

สร้าง Seed สำหรับทดสอบ

Admin

```text
username: admin
password: admin123
```

Student อย่างน้อย 5 คน

Assignment อย่างน้อย 2-3 งาน

แต่ละ Assignment ต้องมี Rubric

ตัวอย่าง

```text
Assignment
รายงานกิจกรรม
20 คะแนน

Rubric
เนื้อหา 8
ความถูกต้อง 5
ความเรียบร้อย 4
ตรงเวลา 3
```

Seed ต้องสามารถรันด้วยแนวทาง Prisma 7

อย่าสมมติว่า Prisma 7 จะเรียก Seed อัตโนมัติหลัง `migrate dev`

หากต้อง Seed ให้ใช้คำสั่ง Seed ที่ Prisma 7 รองรับ เช่น

```bash
prisma db seed
```

ตาม Configuration ของโปรเจกต์

---

# 49. Testing Flow

ต้องตรวจสอบ Flow หลัก

## Student

```text
Login
↓
Dashboard
↓
ดูงาน
↓
เปิด Assignment
↓
ดู Rubric
↓
Upload File
↓
Presigned URL
↓
S3
↓
Submit
↓
รอตรวจ
↓
Admin ตรวจ
↓
Student ดูคะแนน
```

## Admin

```text
Login
↓
Dashboard
↓
เพิ่มนักเรียน
↓
สร้าง Assignment
↓
กำหนด Rubric
↓
ตรวจสอบคะแนน Rubric
↓
Publish
↓
Student Submit
↓
ตรวจ Submission
↓
ให้คะแนน
↓
Feedback
↓
Student เห็นคะแนน
```

---

# 50. ห้ามทำ

ห้ามทำสิ่งต่อไปนี้

```text
❌ prisma db push

❌ prisma migrate reset โดยไม่ได้รับอนุญาต

❌ แก้ Database โดยตรงโดยไม่ผ่าน Migration

❌ ใช้ Prisma API แบบเก่าที่ไม่เข้ากับ Prisma 7

❌ ติดตั้ง Prisma Version ใหม่

❌ เปลี่ยน Prisma Version

❌ เก็บไฟล์งานใน PostgreSQL

❌ Upload File ขนาดใหญ่ผ่าน Next.js Server โดยตรง

❌ เปิด S3 Bucket เป็น Public โดยไม่จำเป็น

❌ ให้ Client กำหนด S3 Object Key เอง

❌ ให้ Student ดู Submission ของ Student คนอื่น

❌ ให้ Student แก้คะแนน

❌ ให้ Client เป็นผู้ตัดสินคะแนนรวม

❌ ตรวจ Validation เฉพาะ Client

❌ เก็บ Password แบบ Plain Text
```

---

# 51. ลำดับการทำงานของ AI Agent

ให้ทำงานตามลำดับนี้

### Phase 1 — ตรวจสอบ Project

ตรวจสอบ

```text
package.json
Next.js version
Prisma version
Tailwind
Material Tailwind
SweetAlert2
```

ห้ามติดตั้ง Package ที่มีอยู่แล้วซ้ำโดยไม่จำเป็น

---

### Phase 2 — อ่าน Prisma 7 Documentation

ก่อนสร้างหรือแก้ Prisma Schema

ต้องตรวจสอบ Official Prisma 7 Documentation โดยเฉพาะ

- Prisma Schema
- Prisma Config
- Prisma Client
- Prisma Migrate
- Prisma 7 Breaking Changes

ใช้ Documentation ปัจจุบันเป็น Source of Truth

---

### Phase 3 — Database

สร้าง

```text
schema.prisma
```

ประกอบด้วย

```text
User
Student
Assignment
AssignmentRubric
Submission
Grade
RubricScore
```

จากนั้นตรวจสอบ Relation และ Constraint

---

### Phase 4 — Migration

สร้าง Migration ด้วย

```bash
prisma migrate dev --name init
```

ห้ามใช้

```bash
prisma db push
```

หาก Prisma ขอ Reset Database

**หยุดทันทีและถามฉัน**

---

### Phase 5 — Authentication

สร้าง

```text
Student Login
Admin Login
Session
Authorization
```

---

### Phase 6 — Assignment

สร้าง

```text
Assignment CRUD
Rubric Builder
Rubric Validation
Publish
Close
```

---

### Phase 7 — S3

สร้าง

```text
S3 Client
Presigned Upload
Presigned Download
File Validation
Private Object
```

---

### Phase 8 — Submission

สร้าง

```text
Upload
Submit
Deadline Check
Submission Status
```

---

### Phase 9 — Grading

สร้าง

```text
RubricScore
Grade
Feedback
Score Calculation
```

---

### Phase 10 — UI

สร้าง UI

```text
Student Dashboard
Student Assignment
Student Submit
Student Grade

Admin Dashboard
Admin Students
Admin Assignments
Admin Submissions
Admin Grading
```

ใช้ Cozy Yellow-Red Theme

---

### Phase 11 — Security Review

ตรวจสอบ

```text
Authentication
Authorization
Ownership
File Access
S3 Permission
Validation
Rate Limiting ที่จำเป็น
```

---

### Phase 12 — Final Test

ทดสอบ Flow ตั้งแต่

```text
Admin Login
↓
สร้างงาน
↓
กำหนด Rubric
↓
Publish
↓
Student Login
↓
Submit
↓
S3 Upload
↓
Admin ตรวจ
↓
Grade
↓
Student ดูคะแนน
```

ต้องแก้ Error ที่พบก่อนถือว่างานเสร็จ

---

# เป้าหมายสุดท้าย

สร้างระบบ MVP ที่เรียบง่าย แต่มี Architecture ที่ดี

หัวใจของระบบคือ

```text
ADMIN
  │
  │ สร้างงาน + กำหนด Rubric
  ▼
ASSIGNMENT
  │
  │ เปิดรับงาน
  ▼
STUDENT
  │
  │ Upload ผ่าน S3 Presigned URL
  ▼
SUBMISSION
  │
  │ Admin ตรวจ
  ▼
RUBRIC SCORE
  │
  ▼
GRADE
  │
  ▼
STUDENT
  │
  ▼
ดูคะแนน + Feedback
```

ระบบต้องเน้น

**Simple + Secure + Maintainable + Cozy UI**

และต้องปฏิบัติตาม Prisma ORM 7 Documentation เป็นหลัก โดยเฉพาะเรื่อง `prisma.config.ts`, Prisma Client และ Prisma Migrate