"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, UserPlus, Save, Loader2, Edit2 } from "lucide-react";
import { createStudentAction, updateStudentAction } from "@/actions/student";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

export interface StudentData {
  id: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string;
  studentNumber: number;
  status: "ACTIVE" | "INACTIVE";
}

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: StudentData | null;
}

export function StudentModal({
  isOpen,
  onClose,
  studentToEdit,
}: StudentModalProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isEditing = !!studentToEdit;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = isEditing
        ? await updateStudentAction(studentToEdit.id, formData)
        : await createStudentAction(formData);

      if (!res.success) {
        setErrorMsg(res.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        setIsPending(false);
        return;
      }

      await showCozySuccess(
        isEditing ? "แก้ไขข้อมูลสำเร็จ!" : "เพิ่มนักเรียนสำเร็จ!",
        res.message
      );

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
              {isEditing ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <h3 className="font-bold text-[#3F342B] text-base">
              {isEditing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มสมาชิกชุมนุมใหม่"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6A5C] hover:bg-[#FAF6F0] hover:text-[#3F342B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-[#B94E48] rounded-xl text-xs font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Student Code */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-[#5A4D41]">
                รหัสประจำตัวนักเรียน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="studentCode"
                required
                defaultValue={studentToEdit?.studentCode || ""}
                placeholder="เช่น 10006"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* First Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5A4D41]">
                ชื่อจริง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                required
                defaultValue={studentToEdit?.firstName || ""}
                placeholder="เช่น ภัทรพล"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5A4D41]">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                required
                defaultValue={studentToEdit?.lastName || ""}
                placeholder="เช่น สมบูรณ์"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Class Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5A4D41]">
                ระดับชั้น/ห้อง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="className"
                required
                defaultValue={studentToEdit?.className || ""}
                placeholder="เช่น ม.4/1"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Student Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5A4D41]">
                เลขที่ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="studentNumber"
                min="1"
                required
                defaultValue={studentToEdit?.studentNumber || ""}
                placeholder="เช่น 1"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs font-bold text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Status (if editing) */}
            {isEditing && (
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-[#5A4D41]">
                  สถานะการเป็นสมาชิก
                </label>
                <select
                  name="status"
                  defaultValue={studentToEdit?.status || "ACTIVE"}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                >
                  <option value="ACTIVE">ปกติ (Active)</option>
                  <option value="INACTIVE">ระงับการใช้งาน (Inactive)</option>
                </select>
              </div>
            )}
          </div>

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
                  <span>{isEditing ? "บันทึกการแก้ไข" : "เพิ่มนักเรียน"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
