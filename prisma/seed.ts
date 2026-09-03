import bcrypt from "bcryptjs";
import { prisma, pool } from "../src/lib/prisma/client";

async function main() {
  console.log("🌱 Seeding database for SSSParty (Admin Account Initialization)...");

  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ username: adminUsername }, { role: "ADMIN" }],
    },
  });

  if (existingAdmin) {
    console.log(`ℹ️ Admin user already exists: "${existingAdmin.username}" (ID: ${existingAdmin.id})`);
    console.log("✅ Admin account is ready. No changes made.");
  } else {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash: adminPasswordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    console.log(`✅ Admin account created successfully!`);
    console.log(`   - Username: ${admin.username}`);
    console.log(`   - Role: ${admin.role}`);
    console.log(`   - ID: ${admin.id}`);
  }

  console.log("🎉 Seed finished successfully (Admin only).");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
