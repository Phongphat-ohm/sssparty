import bcrypt from "bcryptjs";
import { prisma, pool } from "../src/lib/prisma/client";

async function main() {
  console.log("🌱 Starting seed database for SSSParty (ชุมนุมสื่อสร้างสรรค์)...");

  // 1. Seed Admin User
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`✅ Admin created: ${admin.username} (ID: ${admin.id})`);

  // 2. Seed 5 Students
  const sampleStudents = [
    {
      code: "10001",
      firstName: "กิตติพงษ์",
      lastName: "สมบูรณ์",
      className: "ม.4/1",
      studentNumber: 5,
    },
    {
      code: "10002",
      firstName: "ณิชานันท์",
      lastName: "เจริญพร",
      className: "ม.4/1",
      studentNumber: 12,
    },
    {
      code: "20001",
      firstName: "ธีรภัทร",
      lastName: "วัฒนากุล",
      className: "ม.5/2",
      studentNumber: 3,
    },
    {
      code: "20002",
      firstName: "ปภัสสร",
      lastName: "สุขสว่าง",
      className: "ม.5/2",
      studentNumber: 18,
    },
    {
      code: "30001",
      firstName: "วรเมธ",
      lastName: "เกียรติสกุล",
      className: "ม.6/1",
      studentNumber: 1,
    },
  ];

  for (const s of sampleStudents) {
    const user = await prisma.user.upsert({
      where: { username: s.code },
      update: {
        role: "STUDENT",
        status: "ACTIVE",
      },
      create: {
        username: s.code,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });

    const student = await prisma.student.upsert({
      where: { studentCode: s.code },
      update: {
        firstName: s.firstName,
        lastName: s.lastName,
        className: s.className,
        studentNumber: s.studentNumber,
        status: "ACTIVE",
      },
      create: {
        userId: user.id,
        studentCode: s.code,
        firstName: s.firstName,
        lastName: s.lastName,
        className: s.className,
        studentNumber: s.studentNumber,
        status: "ACTIVE",
      },
    });

    console.log(
      `✅ Student created: ${student.studentCode} - ${student.firstName} ${student.lastName} (${student.className} เลขที่ ${student.studentNumber})`
    );
  }

  // 3. Seed Sample Assignments with Rubrics
  // Assignment 1
  const assignment1Title = "ออกแบบแบนเนอร์ประชาสัมพันธ์ชุมนุมสื่อสร้างสรรค์";
  let assignment1 = await prisma.assignment.findFirst({
    where: { title: assignment1Title },
  });

  if (!assignment1) {
    assignment1 = await prisma.assignment.create({
      data: {
        title: assignment1Title,
        description:
          "ให้ออกแบบภาพกราฟิกแบนเนอร์ขนาด 1200x630 px เพื่อใช้โปรโมทกิจกรรมของชุมนุมสื่อสร้างสรรค์ เน้นความสวยงาม ทันสมัย และสื่อสารข้อความได้อย่างชัดเจน",
        maxScore: 20,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "PUBLISHED",
        createdById: admin.id,
        rubrics: {
          create: [
            {
              name: "ความคิดสร้างสรรค์และการสื่อความหมาย",
              description:
                "แนวคิดการออกแบบแปลกใหม่ น่าสนใจ และสื่อถึงเอกลักษณ์ของชุมนุมสื่อสร้างสรรค์ได้อย่างตรงจุด",
              maxScore: 8,
              sortOrder: 1,
            },
            {
              name: "ความถูกต้องขององค์ประกอบศิลป์และการจัดวาง",
              description:
                "การจัดวาง Layer, Typography, และ Hierarchy มีความสมดุล อ่านง่าย สบายตา",
              maxScore: 5,
              sortOrder: 2,
            },
            {
              name: "ความคมชัดและการเลือกใช้ชุดสี",
              description:
                "ความละเอียดภาพคมชัด และการใช้ชุดสี (Color Palette) มีความกลมกลืนหรือคอนทราสต์ที่ลงตัว",
              maxScore: 4,
              sortOrder: 3,
            },
            {
              name: "การส่งงานตรงต่อเวลาและระเบียบของไฟล์",
              description:
                "ส่งไฟล์ตามขนาดและนามสกุลที่กำหนด (JPG, PNG) ตรงตามกำหนดเวลาส่ง",
              maxScore: 3,
              sortOrder: 4,
            },
          ],
        },
      },
    });
    console.log(`✅ Assignment 1 created: "${assignment1.title}" (20 คะแนน, 4 Rubrics)`);
  } else {
    console.log(`ℹ️ Assignment 1 already exists: "${assignment1.title}"`);
  }

  // Assignment 2
  const assignment2Title = "ตัดต่อคลิปสั้น Storyboard เล่าเรื่องชุมนุม";
  let assignment2 = await prisma.assignment.findFirst({
    where: { title: assignment2Title },
  });

  if (!assignment2) {
    assignment2 = await prisma.assignment.create({
      data: {
        title: assignment2Title,
        description:
          "จัดทำคลิปวิดีโอสั้นความยาว 1-2 นาที แนะนำเพื่อนๆ ในชุมนุม หรือถ่ายทอดบรรยากาศการเรียนรู้ในชุมนุมสื่อสร้างสรรค์อย่างมีชีวิตชีวา",
        maxScore: 30,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: "PUBLISHED",
        createdById: admin.id,
        rubrics: {
          create: [
            {
              name: "โครงเรื่องและการเล่าเรื่อง (Storyboard & Pacing)",
              description:
                "ลำดับภาพน่าติดตาม มีการปูเรื่อง จุดสำคัญ และบทสรุปที่กระชับ ไม่น่าเบื่อ",
              maxScore: 15,
              sortOrder: 1,
            },
            {
              name: "เทคนิคการตัดต่อและการเลือกใช้ดนตรี/เสียง",
              description:
                "จังหวะการตัดต่อลื่นไหล เสียงพูดชัดเจน และดนตรีประกอบเข้ากับอารมณ์ของวิดีโอ",
              maxScore: 10,
              sortOrder: 2,
            },
            {
              name: "คุณภาพของภาพและความละเอียดของสื่อ",
              description:
                "ภาพคมชัด (Full HD ขึ้นไป) แสงเหมาะสม ไม่สั่นไหวจนรบกวนการชม",
              maxScore: 5,
              sortOrder: 3,
            },
          ],
        },
      },
    });
    console.log(`✅ Assignment 2 created: "${assignment2.title}" (30 คะแนน, 3 Rubrics)`);
  } else {
    console.log(`ℹ️ Assignment 2 already exists: "${assignment2.title}"`);
  }

  console.log("🎉 Seed database completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
