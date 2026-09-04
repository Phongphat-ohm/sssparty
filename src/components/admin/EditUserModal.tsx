"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Edit2, Save, Loader2, Shield, GraduationCap, AlertCircle } from "lucide-react";
import { updateUserAction } from "@/actions/user";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

export interface UserItem {
  id: string;
  username: string;
  role: "ADMIN" | "STUDENT";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  hasPassword: boolean;
  displayName: string;
  studentInfo?: {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    className: string;
    studentNumber: number;
  } | null;
  counts: {
    createdAssignments: number;
    gradesGiven: number;
    createdAttendanceSessions: number;
  };
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: UserItem | null;
  currentUserId: string;
}

export function EditUserModal({
  isOpen,
  onClose,
  userToEdit,
  currentUserId,
}: EditUserModalProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !userToEdit) return null;

  const isSelf = userToEdit.id === currentUserId;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);

    // หากเป็นบัญชีตัวเอง ให้คง role และ status เดิมไว้
    if (isSelf) {
      formData.set("role", userToEdit.role);
      formData.set("status", userToEdit.status);
    }

    try {
      const res = await updateUserAction(userToEdit.id, formData);

      if (!res.success) {
        setErrorMsg(res.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
        setIsPending(false);
        return;
      }

      await showCozySuccess("สำเร็จ!", res.message);
      onClose();
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                แก้ไขข้อมูลผู้ใช้งาน
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                บัญชี: <span className="font-bold text-[#3F342B]">{userToEdit.username}</span>
                {isSelf && " (บัญชีของคุณ)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6A5C] hover:bg-[#FAF6F0] hover:text-[#3F342B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          {isSelf && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                คุณกำลังแก้ไขบัญชีของตนเอง จึงไม่สามารถเปลี่ยนระดับสิทธิ์หรือระงับสถานะบัญชีได้
              </span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              required
              minLength={3}
              maxLength={30}
              defaultValue={userToEdit.username}
              placeholder="ชื่อผู้ใช้"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              ระดับสิทธิ์ (Role)
            </label>
            <select
              name="role"
              defaultValue={userToEdit.role}
              disabled={isSelf}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 disabled:bg-stone-100"
            >
              <option value="ADMIN">ผู้ดูแลระบบ / อาจารย์ (ADMIN)</option>
              <option value="STUDENT">นักเรียน (STUDENT)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5A4D41]">
              สถานะบัญชี (Status)
            </label>
            <select
              name="status"
              defaultValue={userToEdit.status}
              disabled={isSelf}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 disabled:bg-stone-100"
            >
              <option value="ACTIVE">ปกติ / เปิดใช้งาน (ACTIVE)</option>
              <option value="INACTIVE">ระงับการใช้งาน (INACTIVE)</option>
            </select>
          </div>

          {/* Linked student info display */}
          {userToEdit.studentInfo && (
            <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] text-xs space-y-1">
              <span className="font-semibold text-[#8C5D23] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                ข้อมูลนักเรียนที่ผูกกับบัญชีนี้:
              </span>
              <p className="text-[#3F342B]">
                {userToEdit.studentInfo.firstName} {userToEdit.studentInfo.lastName} (ห้อง{" "}
                {userToEdit.studentInfo.className} เลขที่ {userToEdit.studentInfo.studentNumber})
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2E8DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D9CABB] text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการแก้ไข</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
