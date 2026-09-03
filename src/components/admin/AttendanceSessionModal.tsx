"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Save, Loader2, X, Sparkles } from "lucide-react";
import {
  createAttendanceSessionAction,
  updateAttendanceSessionInfoAction,
} from "@/actions/attendance";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

export interface AttendanceSessionData {
  id?: string;
  title: string;
  date: string;
  academicTerm: string;
  note?: string;
}

interface AttendanceSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: AttendanceSessionData | null;
}

export function AttendanceSessionModal({
  isOpen,
  onClose,
  sessionToEdit,
}: AttendanceSessionModalProps) {
  const router = useRouter();
  const isEditing = !!sessionToEdit?.id;

  const todayStr = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState(sessionToEdit?.title || "");
  const [date, setDate] = useState(
    sessionToEdit?.date ? new Date(sessionToEdit.date).toISOString().split("T")[0] : todayStr
  );
  const [academicTerm, setAcademicTerm] = useState(sessionToEdit?.academicTerm || "1/2569");
  const [note, setNote] = useState(sessionToEdit?.note || "");
  const [isPending, setIsPending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("date", date);
    formData.set("academicTerm", academicTerm);
    if (note) formData.set("note", note);

    try {
      let res;
      if (isEditing && sessionToEdit?.id) {
        res = await updateAttendanceSessionInfoAction(sessionToEdit.id, formData);
      } else {
        res = await createAttendanceSessionAction(formData);
      }

      if (res.success) {
        await showCozySuccess("สำเร็จ!", res.message);
        onClose();
        if (res.sessionId && !isEditing) {
          router.push(`/admin/attendance/${res.sessionId}`);
        } else {
          router.refresh();
        }
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center border border-[#EADBCC]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                {isEditing ? "แก้ไขรอบการเช็กชื่อ" : "สร้างรอบเช็กชื่อกิจกรรมใหม่"}
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                {isEditing ? "ปรับปรุงข้อมูลหรือวันที่จัดกิจกรรม" : "กำหนดวันที่และหัวข้อกิจกรรมชุมนุม"}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41]">
              หัวข้อกิจกรรม / ครั้งที่ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ครั้งที่ 1: แนะนำชุมนุมสื่อสร้างสรรค์"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                วันที่จัดกิจกรรม <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                ภาคเรียน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={academicTerm}
                onChange={(e) => setAcademicTerm(e.target.value)}
                placeholder="1/2569"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#5A4D41]">
              รายละเอียดเพิ่มเติม / หมายเหตุ
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น กิจกรรมภาคปฏิบัติ ณ ห้องปฏิบัติการคอมพิวเตอร์"
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F2E8DC]">
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? "บันทึกการแก้ไข" : "สร้างและเริ่มเช็กชื่อ"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
