import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Users,
  Award,
  Download,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: Promise<{ reportCode: string }>;
}

export default async function VerifyReportPage({ params }: VerifyPageProps) {
  const resolved = await params;
  const { reportCode } = resolved;

  // ค้นหาเอกสารจากฐานข้อมูล
  const report = await prisma.generatedReport.findUnique({
    where: { reportCode },
    include: {
      printedBy: {
        select: {
          username: true,
          adminRole: true,
        },
      },
    },
  });

  // แปลงสถิติจาก metadata JSON
  let stats: any = null;
  if (report?.metadata) {
    try {
      stats = JSON.parse(report.metadata);
    } catch {}
  }

  const formattedDate = report?.createdAt
    ? new Date(report.createdAt).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    : "-";

  return (
    <div className="min-h-screen bg-[#FFF9F0] py-8 px-4 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF0E1] text-[#8C5D23] text-xs font-bold border border-[#EADBCC]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ระบบตรวจสอบความถูกต้องเอกสาร (Document Verification)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#222222]">
            ชุมนุมสื่อสร้างสรรค์ (3S Party)
          </h1>
          <p className="text-xs sm:text-sm text-[#666666]">
            Creative Media Club • สารระบบและเอกสารราชการอิเล็กทรอนิกส์
          </p>
        </div>

        {/* Verification Result Card */}
        {report ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EADBCC] shadow-xl space-y-6 animate-fadeIn">
            {/* Success Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5 text-emerald-900">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h2 className="font-bold text-sm sm:text-base text-emerald-950">
                  เอกสารนี้ได้รับการยืนยันว่าเป็นเอกสารจริง (Verified)
                </h2>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  สร้างและจัดเก็บสำเนาต้นฉบับในคลังจัดเก็บข้อมูลปลอดภัย (S3 Storage) ของระบบ 3S Party
                </p>
              </div>
            </div>

            {/* Document Details Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#8C5D23] uppercase tracking-wider">
                ข้อมูลเอกสารรายงาน
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC]/60 space-y-1">
                  <span className="text-[#888888] flex items-center gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-[#8C5D23]" />
                    รหัสเอกสารอ้างอิง
                  </span>
                  <p className="font-bold font-mono text-sm text-[#111111]">{report.reportCode}</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC]/60 space-y-1">
                  <span className="text-[#888888] flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#8C5D23]" />
                    วันและเวลาที่ออกเอกสาร
                  </span>
                  <p className="font-bold text-sm text-[#111111]">{formattedDate}</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC]/60 space-y-1 sm:col-span-2">
                  <span className="text-[#888888] flex items-center gap-1.5 font-medium">
                    <Award className="w-3.5 h-3.5 text-[#8C5D23]" />
                    หัวข้อภาระงาน
                  </span>
                  <p className="font-bold text-sm text-[#111111]">{report.title}</p>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC]/60 space-y-1">
                  <span className="text-[#888888] flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-[#8C5D23]" />
                    ภาคเรียน / กลุ่มเป้าหมาย
                  </span>
                  <p className="font-bold text-xs text-[#111111]">
                    ภาคเรียนที่ {report.academicTerm} •{" "}
                    {report.targetClass === "ALL" ? "ทุกห้องเรียน" : `ห้อง ${report.targetClass}`}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#EADBCC]/60 space-y-1">
                  <span className="text-[#888888] flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-[#8C5D23]" />
                    ผู้จัดพิมพ์รายงาน (ครูผู้สอน)
                  </span>
                  <p className="font-bold text-xs text-[#111111]">
                    {report.printedByName} ({report.printedBy?.adminRole || "TEACHER"})
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Summary if available */}
            {stats && (
              <div className="space-y-2 pt-2 border-t border-[#EADBCC]/60">
                <h3 className="text-xs font-bold text-[#8C5D23] uppercase tracking-wider">
                  สถิติภาพรวมในเอกสาร
                </h3>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-[#FAF6F0] border border-[#EADBCC]">
                    <span className="text-[10px] text-[#777] block">นักเรียนทั้งหมด</span>
                    <strong className="font-bold text-sm text-[#222]">{stats.total || "-"}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 block">ส่งงานแล้ว</span>
                    <strong className="font-bold text-sm text-emerald-800">
                      {stats.submitted || "-"}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] text-blue-700 block">ตรวจแล้ว</span>
                    <strong className="font-bold text-sm text-blue-800">
                      {stats.graded || "-"}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] text-amber-700 block">คะแนนเฉลี่ย</span>
                    <strong className="font-bold text-sm text-amber-800">
                      {stats.avgScore || "-"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#111111] hover:bg-[#333333] transition-all shadow-md cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดดูเอกสาร PDF ต้นฉบับ (S3)</span>
              </a>

              <a
                href={report.fileUrl}
                download={`${report.reportCode}.pdf`}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold text-[#3F342B] bg-[#FAF0E1] hover:bg-[#EADBCC] transition-all border border-[#D9CABB] cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#8C5D23]" />
                <span>ดาวน์โหลด PDF</span>
              </a>
            </div>
          </div>
        ) : (
          /* Error / Not Found Banner */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xl space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-lg font-bold text-[#111111]">ไม่พบข้อมูลเอกสารนี้ในระบบ</h2>
              <p className="text-xs text-[#666666] leading-relaxed">
                รหัสเอกสาร <strong className="font-mono text-rose-600">{reportCode}</strong>{" "}
                ไม่ตรงกับเอกสารทางการใด ๆ ในฐานข้อมูลชุมนุมสื่อสร้างสรรค์ โปรดระวังเอกสารปลอมแปลง
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-[#3F342B] bg-[#FAF0E1] hover:bg-[#EADBCC] transition-all border border-[#D9CABB]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับสู่หน้าหลัก</span>
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-[11px] text-[#888888] space-y-1">
        <p>© 2026 3S Party — ชุมนุมสื่อสร้างสรรค์. All rights reserved.</p>
        <p>เอกสารจัดเก็บด้วยความปลอดภัยบนระบบคลาวด์มาตรฐานระดับองค์กร</p>
      </footer>
    </div>
  );
}
