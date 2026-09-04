import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { UsersTableClient } from "@/components/admin/UsersTableClient";
import { UserItem } from "@/components/admin/EditUserModal";

export default async function AdminUsersPage() {
  const session = await getAuthSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const users = await prisma.user.findMany({
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          firstName: true,
          lastName: true,
          className: true,
          studentNumber: true,
        },
      },
      _count: {
        select: {
          createdAssignments: true,
          gradesGiven: true,
          createdAttendanceSessions: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  const formattedUsers: UserItem[] = users.map((u) => {
    let displayName = u.username;
    if (u.student) {
      displayName = `${u.student.firstName} ${u.student.lastName}`;
    } else if (u.role === "ADMIN") {
      displayName =
        u.id === session.userId
          ? "คุณ (ผู้ดูแลระบบปัจจุบัน)"
          : "ผู้ดูแลระบบ / อาจารย์ผู้สอน";
    }

    return {
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      hasPassword: !!u.passwordHash,
      displayName,
      studentInfo: u.student || null,
      counts: {
        createdAssignments: u._count.createdAssignments,
        gradesGiven: u._count.gradesGiven,
        createdAttendanceSessions: u._count.createdAttendanceSessions,
      },
    };
  });

  const stats = {
    totalUsers: users.length,
    adminCount: users.filter((u) => u.role === "ADMIN").length,
    studentCount: users.filter((u) => u.role === "STUDENT").length,
    activeCount: users.filter((u) => u.status === "ACTIVE").length,
    inactiveCount: users.filter((u) => u.status === "INACTIVE").length,
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto">
      <UsersTableClient
        initialUsers={formattedUsers}
        currentUserId={session.userId}
        stats={stats}
      />
    </div>
  );
}
