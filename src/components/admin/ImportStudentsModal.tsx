"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Table,
  ClipboardPaste,
} from "lucide-react";
import {
  parseStudentCSV,
  generateStudentCSVTemplate,
  ParsedStudentRow,
} from "@/lib/utils/csv-parser";
import { importStudentsAction } from "@/actions/student";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportStudentsModal({ isOpen, onClose }: ImportStudentsModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawContent, setRawContent] = useState("");
  const [parsedData, setParsedData] = useState<{
    rows: ParsedStudentRow[];
    totalRows: number;
    validRows: number;
    invalidRows: number;
  } | null>(null);

  const [isPending, setIsPending] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<"file" | "paste">("file");

  if (!isOpen) return null;

  // จัดการการเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawContent(text);
        const result = parseStudentCSV(text);
        setParsedData(result);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // จัดการการพิมพ์/วางข้อความ
  const handleTextChange = (text: string) => {
    setRawContent(text);
    if (text.trim()) {
      const result = parseStudentCSV(text);
      setParsedData(result);
    } else {
      setParsedData(null);
    }
  };

  // ดาวน์โหลด Template CSV
  const handleDownloadTemplate = () => {
    const templateContent = generateStudentCSVTemplate();
    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "3SParty_Student_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // กดยืนยันนำเข้าข้อมูล
  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.validRows === 0) {
      await showCozyError("ไม่สามารถนำเข้าได้", "ไม่มีข้อมูลนักเรียนที่ถูกต้อง");
      return;
    }

    setIsPending(true);

    const validStudents = parsedData.rows
      .filter((r) => r.isValid)
      .map((r) => ({
        studentCode: r.studentCode,
        firstName: r.firstName,
        lastName: r.lastName,
        className: r.className,
        studentNumber: r.studentNumber,
      }));

    try {
      const res = await importStudentsAction(validStudents);
      if (res.success) {
        await showCozySuccess("นำเข้าข้อมูลสำเร็จ!", res.message);
        onClose();
        router.refresh();
      } else {
        await showCozyError("เกิดข้อผิดพลาดในการนำเข้า", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = () => {
    setRawContent("");
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#EADBCC] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#F2E8DC] flex items-center justify-between bg-[#FFF9F0] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0E1] text-[#D9A441] flex items-center justify-center border border-[#EADBCC]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#3F342B] text-base leading-tight">
                นำเข้าข้อมูลนักเรียน (Import Students CSV)
              </h3>
              <p className="text-[11px] text-[#7A6A5C]">
                เพิ่มหรืออัปเดตสมาชิกชุมนุมเป็นกลุ่มจากไฟล์ CSV หรือตาราง Excel
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Top Bar: Template Download & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#FAF6F0] p-3 rounded-2xl border border-[#EADBCC]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveInputTab("file")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === "file"
                    ? "bg-white text-[#3F342B] shadow-2xs border border-[#EADBCC]"
                    : "text-[#7A6A5C] hover:text-[#3F342B]"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>อัปโหลดไฟล์ CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInputTab("paste")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === "paste"
                    ? "bg-white text-[#3F342B] shadow-2xs border border-[#EADBCC]"
                    : "text-[#7A6A5C] hover:text-[#3F342B]"
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>วางข้อมูลจาก Excel</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#8C5D23] bg-white border border-[#EADBCC] hover:border-[#D9A441] transition-all cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>ดาวน์โหลดไฟล์ตัวอย่าง (.csv)</span>
            </button>
          </div>

          {/* Input Method: File Upload */}
          {activeInputTab === "file" && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="border-2 border-dashed border-[#D9CABB] hover:border-[#D9A441] bg-[#FFF9F0]/60 rounded-3xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-[#D9A441] flex items-center justify-center shadow-xs border border-[#EADBCC]">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#3F342B]">
                    คลิกเพื่อเลือกไฟล์ CSV หรือ TXT จากเครื่องของคุณ
                  </p>
                  <p className="text-[11px] text-[#7A6A5C] mt-0.5">
                    รองรับไฟล์ที่มีคอลัมน์: รหัสนักเรียน, ชื่อ, นามสกุล, ห้อง, เลขที่
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Input Method: Paste Text */}
          {activeInputTab === "paste" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A4D41]">
                วางข้อมูลข้อความตารางจาก Excel หรือ Google Sheets ที่นี่:
              </label>
              <textarea
                rows={4}
                value={rawContent}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="รหัสนักเรียน&#9;ชื่อ&#9;นามสกุล&#9;ห้อง&#9;เลขที่&#10;10006&#9;ก้องภพ&#9;สุขสมบูรณ์&#9;ม.4/1&#9;6"
                className="w-full p-3 rounded-2xl border border-[#D9CABB] bg-[#FAF6F0] text-xs font-mono text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          )}

          {/* Preview & Validation Results */}
          {parsedData && (
            <div className="space-y-3 pt-2">
              {/* Summary Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF9F0] p-3 rounded-2xl border border-[#EADBCC]">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#D9A441]" />
                  <span className="text-xs font-bold text-[#3F342B]">
                    ตัวอย่างข้อมูลที่ตรวจพบ ({parsedData.totalRows} แถว)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    พร้อมนำเข้า: {parsedData.validRows} คน
                  </span>

                  {parsedData.invalidRows > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      ข้อมูลไม่สมบูรณ์: {parsedData.invalidRows} แถว
                    </span>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-[#EADBCC] rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF6F0] border-b border-[#EADBCC] text-[#5A4D41] sticky top-0 font-bold">
                    <tr>
                      <th className="p-2.5 pl-3">รหัส</th>
                      <th className="p-2.5">ชื่อ-นามสกุล</th>
                      <th className="p-2.5">ห้อง</th>
                      <th className="p-2.5">เลขที่</th>
                      <th className="p-2.5 pr-3">สถานะการตรวจสอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E8DC]">
                    {parsedData.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? "hover:bg-[#FAF6F0]/50" : "bg-red-50/60"}
                      >
                        <td className="p-2.5 pl-3 font-semibold text-[#3F342B]">
                          {row.studentCode || "-"}
                        </td>
                        <td className="p-2.5 text-[#3F342B]">
                          {row.firstName} {row.lastName}
                        </td>
                        <td className="p-2.5 text-[#5A4D41]">{row.className || "-"}</td>
                        <td className="p-2.5 font-bold text-[#3F342B]">
                          #{row.studentNumber || "-"}
                        </td>
                        <td className="p-2.5 pr-3">
                          {row.isValid ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              พร้อมนำเข้า
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#F2E8DC] bg-white flex items-center justify-between shrink-0">
          <div>
            {parsedData && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-[#7A6A5C] hover:text-[#B94E48] underline cursor-pointer"
              >
                ล้างข้อมูล
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D9CABB] text-xs font-semibold text-[#7A6A5C] hover:bg-[#FAF6F0] transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isPending || !parsedData || parsedData.validRows === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#D9A441] hover:bg-[#C28F30] active:scale-95 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังนำเข้าข้อมูล...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    ยืนยันนำเข้าข้อมูล {parsedData ? `(${parsedData.validRows} คน)` : ""}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
