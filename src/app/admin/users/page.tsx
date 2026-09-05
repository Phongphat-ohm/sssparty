import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { requireAdminPermission } from "@/lib/auth/permissions-server";
import { UsersTableClient } from "@/components/admin/UsersTableClient";
import { UserItem } from "@/components/admin/EditUserModal";

export default async function AdminUsersPage() {
  const authCheck = await requireAdminPermission("MANAGE_USERS");
  if (!authCheck.ok) {
    redirect("/admin/dashboard");
  }

  const { user: currentAdmin } = authCheck;

  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    include: {
      _count: {
        select: {
          createdAssignments: true,
          gradesGiven: true,
          createdAttendanceSessions: true,
        },
      },
    },
    orderBy: [{ adminRole: "asc" }, { createdAt: "desc" }],
  });

  const formattedUsers: UserItem[] = users.map((u) => {
    const displayName =
      u.id === currentAdmin.id
        ? "คุณ (ผู้ใช้งานปัจจุบัน)"
        : u.adminRole === "SUPER_ADMIN"
        ? "ผู้ดูแลระบบสูงสุด (Super Admin)"
        : u.adminRole === "TEACHER"
        ? "อาจารย์ผู้สอน (Teacher)"
        : u.adminRole === "ASSISTANT"
        ? "ผู้ช่วยสอน (Assistant)"
        : "ผู้ดูแลระบบ (Custom)";

    return {
      id: u.id,
      username: u.username,
      role: u.role,
      adminRole: u.adminRole,
      permissions: u.permissions as any,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      hasPassword: !!u.passwordHash,
      displayName,
      studentInfo: null,
      counts: {
        createdAssignments: u._count.createdAssignments,
        gradesGiven: u._count.gradesGiven,
        createdAttendanceSessions: u._count.createdAttendanceSessions,
      },
    };
  });

  const stats = {
    totalUsers: users.length,
    adminCount: users.length,
    studentCount: 0,
    activeCount: users.filter((u) => u.status === "ACTIVE").length,
    inactiveCount: users.filter((u) => u.status === "INACTIVE").length,
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
      <UsersTableClient
        initialUsers={formattedUsers}
        currentUserId={currentAdmin.id}
        currentUserRole={currentAdmin.adminRole}
        stats={stats}
      />
    </div>
  );
}
