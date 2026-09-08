"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  Printer,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { printDirectDocument } from "@/lib/export/print-helper";
import { showCozyConfirm, showCozySuccess, showCozyError } from "@/lib/ui/swal";
import {
  saveOfficialAssignmentReportAction,
  saveOfficialAttendanceReportAction,
  saveOfficialAttendanceSummaryReportAction,
  saveOfficialEvaluationReportAction,
} from "@/actions/report-actions";
import { ActionDropdown } from "@/components/ui/ActionDropdown";

export interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename?: string;
  orientation?: "portrait" | "landscape";
  pdfApiUrl?: string;
  htmlContent?: string;
  reportType?: "ASSIGNMENT" | "ATTENDANCE" | "ATTENDANCE_SUMMARY" | "EVALUATION";
  assignmentId?: string;
  sessionId?: string;
  filterClass?: string;
  isAlreadyOfficial?: boolean;
  onSavedOfficial?: (reportCode: string, fileUrl?: string | null) => void;
}

export function PdfReportModal({
  isOpen,
  onClose,
  title,
  filename = "รายงาน",
  orientation = "portrait",
  pdfApiUrl,
  htmlContent,
  reportType,
  assignmentId,
  sessionId,
  filterClass = "ALL",
  isAlreadyOfficial = false,
  onSavedOfficial,
}: PdfReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [currentFetchUrl, setCurrentFetchUrl] = useState<string | undefined>(pdfApiUrl);

  const [isOfficialSaved, setIsOfficialSaved] = useState<boolean>(isAlreadyOfficial);
  const [officialCode, setOfficialCode] = useState<string | null>(null);
  const [savingOfficial, setSavingOfficial] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync isAlreadyOfficial & pdfApiUrl when opened
  useEffect(() => {
    if (isOpen) {
      setIsOfficialSaved(Boolean(isAlreadyOfficial));
      setOfficialCode(null);
      setCurrentFetchUrl(pdfApiUrl);
    }
  }, [isOpen, isAlreadyOfficial, pdfApiUrl]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Fetch PDF blob from active URL
  const fetchPdf = useCallback(async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || currentFetchUrl;
    if (!targetUrl) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(targetUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.error || `ไม่สามารถสร้างเอกสารได้ (HTTP ${res.status}: ${res.statusText})`
        );
      }

      const blob = await res.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newBlobUrl);
    } catch (err: any) {
      console.error("Fetch PDF error:", err);
      setError(err?.message || "เกิดข้อผิดพลาดในการสร้างเอกสารรายงาน");
    } finally {
      setLoading(false);
    }
  }, [currentFetchUrl]);

  useEffect(() => {
    if (isOpen && currentFetchUrl) {
      fetchPdf(currentFetchUrl);
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [isOpen, currentFetchUrl, fetchPdf]);

  // Action บันทึกรายงานฉบับสมบูรณ์ (Official) ลง Cloud S3
  const handleSaveOfficial = async () => {
    if (!reportType) return;

    const confirmed = await showCozyConfirm({
      title: "ยืนยันบันทึกรายงานฉบับสมบูรณ์",
      html: `
        <div class="text-left text-sm space-y-2.5 text-[#5C4D3C] mt-2">
          <p class="leading-relaxed font-semibold text-[#3F342B]">
            ระบบจะดำเนินการสร้างเอกสารฉบับสมบูรณ์และจัดเก็บถาวร:
          </p>
          <ul class="list-disc list-inside space-y-1.5 text-xs text-[#7A6A5C] bg-[#FAF0E1]/80 p-3 rounded-xl border border-[#EADBCC]">
            <li>ออกรหัสเอกสารราชการทางการ (เช่น <b>DOC-3S-2569-xxxx</b>)</li>
            <li>สร้างและฝัง <b>QR Code ตรวจสอบความถูกต้องของเอกสาร</b></li>
            <li>อัปโหลดไฟล์ PDF ฉบับทางการจัดเก็บลง <b>Cloud Storage (S3)</b></li>
            <li>บันทึกประวัติการสร้างเอกสารและ Audit Log ในระบบ</li>
          </ul>
          <p class="text-[11px] text-[#A8988B] italic">
            * หลังจากบันทึกแล้ว เอกสารจะสามารถสแกน QR Code เพื่อตรวจสอบผลได้ทันที
          </p>
        </div>
      `,
      confirmText: "💾 บันทึกรายงานฉบับสมบูรณ์",
      cancelText: "ยกเลิก",
      icon: "info",
    });

    if (!confirmed) return;

    setSavingOfficial(true);
    try {
      let res: {
        success: boolean;
        message: string;
        reportCode?: string;
        fileUrl?: string | null;
        fileName?: string;
      };

      if (reportType === "ASSIGNMENT") {
        if (!assignmentId) throw new Error("ไม่พบรหัสภาระงาน (Assignment ID)");
        res = await saveOfficialAssignmentReportAction({
          assignmentId,
          filterClass,
        });
      } else if (reportType === "ATTENDANCE") {
        if (!sessionId) {
          res = await saveOfficialAttendanceSummaryReportAction({
            filterClass,
          });
        } else {
          res = await saveOfficialAttendanceReportAction({
            sessionId,
            filterClass,
          });
        }
      } else if (reportType === "ATTENDANCE_SUMMARY") {
        res = await saveOfficialAttendanceSummaryReportAction({
          filterClass,
        });
      } else if (reportType === "EVALUATION") {
        res = await saveOfficialEvaluationReportAction({
          filterClass,
        });
      } else {
        throw new Error("ประเภทรายงานไม่ถูกต้อง");
      }

      if (res.success && res.reportCode) {
        setIsOfficialSaved(true);
        setOfficialCode(res.reportCode);

        // Update PDF to show official version with QR Code
        let officialUrl = res.fileUrl;
        if (!officialUrl && pdfApiUrl) {
          officialUrl = pdfApiUrl.includes("mode=")
            ? pdfApiUrl.replace(/mode=[^&]+/, "mode=official")
            : `${pdfApiUrl}${pdfApiUrl.includes("?") ? "&" : "?"}mode=official`;
        }

        if (officialUrl) {
          setCurrentFetchUrl(officialUrl);
          fetchPdf(officialUrl);
        }

        onSavedOfficial?.(res.reportCode, res.fileUrl);

        await showCozySuccess({
          title: "บันทึกรายงานฉบับสมบูรณ์สำเร็จ!",
          html: `
            <div class="text-left text-sm space-y-2 text-[#5C4D3C] mt-2">
              <p>ระบบได้ออกรหัสเอกสารทางการและบันทึกข้อมูลเรียบร้อยแล้ว:</p>
              <div class="p-3 bg-[#FAF0E1] border border-[#EADBCC] rounded-xl flex items-center justify-between">
                <span class="text-xs text-[#7A6A5C]">รหัสเอกสาร:</span>
                <span class="font-mono font-bold text-amber-800 text-sm tracking-wider">${res.reportCode}</span>
              </div>
              <p class="text-xs text-[#7A6A5C]">
                เอกสารมี QR Code ตรวจสอบความถูกต้องและจัดเก็บบน Cloud S3 เรียบร้อยแล้ว
              </p>
            </div>
          `,
        });
      } else {
        await showCozyError({
          title: "ไม่สามารถบันทึกรายงานได้",
          text: res.message || "เกิดข้อผิดพลาดในการบันทึกรายงานฉบับสมบูรณ์",
        });
      }
    } catch (err: any) {
      console.error("Save official report error:", err);
      await showCozyError({
        title: "เกิดข้อผิดพลาด",
        text: err?.message || "ไม่สามารถดำเนินการบันทึกรายงานได้",
      });
    } finally {
      setSavingOfficial(false);
    }
  };

  if (!isOpen) return null;

  // Print handler
  const handlePrint = () => {
    if (pdfBlobUrl && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.print();
        return;
      } catch (e) {
        console.warn("Direct iframe print failed, opening in window:", e);
      }
      window.open(pdfBlobUrl, "_blank");
    } else if (htmlContent) {
      printDirectDocument({
        title,
        orientation,
        htmlContent,
      });
    }
  };

  // Download handler
  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const downloadName = officialCode ? `${officialCode}_${filename}` : filename;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = downloadName.endsWith(".pdf") ? downloadName : `${downloadName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Open in new tab
  const handleOpenNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, "_blank");
    }
  };

  const isLandscape = orientation === "landscape";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-fadeIn">
      {/* Container Dialog */}
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[94vh] bg-[#FAF6F0] rounded-3xl shadow-2xl border border-[#EADBCC] flex flex-col overflow-hidden">
        {/* Top Control Bar (Fixed) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-6 py-3.5 bg-white border-b border-[#EADBCC] shadow-2xs shrink-0 z-20 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-xs font-sarabun shrink-0">
              PDF
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#111111]">{title}</h2>

                {/* Status Badge: Official vs Preview */}
                {isOfficialSaved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>ฉบับทางการ (Official){officialCode ? `: ${officialCode}` : ""}</span>
                  </span>
                ) : reportType ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>ฉบับร่าง (Preview) – ยังไม่บันทึก S3</span>
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    PDF Engine
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#666666] mt-0.5">
                เอกสารทางการขาว-ดำ (Font: TH Sarabun New) ขนาด A4 ({isLandscape ? "แนวนอน Landscape" : "แนวตั้ง Portrait"})
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Modal Options Dropdown */}
            <ActionDropdown
              align="right"
              label="ตัวเลือกรายงาน"
              variant="outline"
              menuWidth="w-64 sm:w-72"
              groups={[
                ...(reportType
                  ? [
                      {
                        title: "การจัดเก็บเอกสาร",
                        items: [
                          ...(!isOfficialSaved
                            ? [
                                {
                                  label: savingOfficial
                                    ? "กำลังบันทึก S3..."
                                    : "บันทึกฉบับสมบูรณ์ (S3)",
                                  subLabel: "ออกรหัสเอกสารทางการพร้อม QR Code",
                                  icon: savingOfficial ? (
                                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4 text-amber-600" />
                                  ),
                                  variant: "warning" as const,
                                  disabled: savingOfficial || loading,
                                  onClick: handleSaveOfficial,
                                },
                              ]
                            : officialCode
                            ? [
                                {
                                  label: "ตรวจสอบเอกสารทางการ (QR)",
                                  subLabel: `รหัสเอกสาร: ${officialCode}`,
                                  icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
                                  variant: "success" as const,
                                  href: `/verify/${officialCode}`,
                                  target: "_blank",
                                },
                              ]
                            : []),
                        ],
                      },
                    ]
                  : []),
                {
                  title: "ดาวน์โหลด & แสดงผล",
                  items: [
                    {
                      label: "ดาวน์โหลดไฟล์ PDF",
                      subLabel: officialCode
                        ? `บันทึกไฟล์ ${officialCode}.pdf`
                        : "บันทึกเอกสาร PDF ลงในเครื่อง",
                      icon: <Download className="w-4 h-4 text-[#8C5D23]" />,
                      disabled: !pdfBlobUrl || loading,
                      onClick: handleDownload,
                    },
                    {
                      label: "เปิดเอกสารในแท็บใหม่",
                      subLabel: "เปิดดูไฟล์ PDF เต็มจอในเบราว์เซอร์",
                      icon: <ExternalLink className="w-4 h-4 text-blue-600" />,
                      disabled: !pdfBlobUrl || loading,
                      onClick: handleOpenNewTab,
                    },
                    {
                      label: "โหลดเอกสารใหม่อีกครั้ง",
                      subLabel: "รีเฟรชการสร้างไฟล์ PDF",
                      icon: <RefreshCw className="w-4 h-4 text-stone-500" />,
                      disabled: loading,
                      onClick: () => fetchPdf(),
                    },
                  ],
                },
              ]}
            />

            {/* Primary Print Button */}
            {(!loading || htmlContent) && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={Boolean(loading || (currentFetchUrl && !pdfBlobUrl))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#111111] hover:bg-[#333333] active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                title="สั่งพิมพ์เอกสารทันที"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์เอกสาร</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#777777] hover:bg-[#FAF0E1] hover:text-[#111111] transition-colors cursor-pointer ml-1"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Area */}
        <div className="flex-1 min-h-0 w-full p-2 sm:p-4 bg-[#8C867A] flex flex-col items-center justify-center overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/95 rounded-3xl shadow-2xl border border-white/50 max-w-md w-full animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF0E1] flex items-center justify-center text-[#8C5D23] mb-4 shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-[#111111] mb-1">
                {savingOfficial ? "กำลังจัดทำรายงานฉบับทางการ..." : "กำลังสร้างตัวอย่างเอกสารรายงาน..."}
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed mb-4">
                ระบบกำลังเรนเดอร์เอกสาร PDF ผ่าน Engine ภายในเครื่องตามมาตรฐานแบบฟอร์ม
              </p>
              <div className="w-full bg-[#FAF6F0] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#D9A441] h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-md w-full animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#111111] mb-1">
                ไม่สามารถสร้างรายงานได้
              </h3>
              <p className="text-xs text-rose-600 bg-rose-50/70 p-3 rounded-xl border border-rose-100 mb-4 break-words w-full">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchPdf()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#111111] hover:bg-[#333333] transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          )}

          {/* Render PDF via <iframe> */}
          {!loading && !error && pdfBlobUrl && (
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col">
              <iframe
                ref={iframeRef}
                src={`${pdfBlobUrl}#toolbar=1`}
                className="w-full h-full border-none"
                title={title}
              />
            </div>
          )}

          {/* Fallback HTML paper sheet */}
          {!currentFetchUrl && htmlContent && (
            <div className="w-full h-full overflow-y-auto overflow-x-auto p-2 sm:p-6 select-text">
              <div className="w-fit mx-auto py-2 sm:py-4">
                <div
                  className={`bg-white shadow-2xl rounded-xs p-8 sm:p-12 text-black transition-all ${
                    isLandscape ? "w-[1100px] min-h-[780px]" : "w-[840px] min-h-[1100px]"
                  } h-auto`}
                  style={{
                    fontFamily:
                      "'TH Sarabun New', 'THSarabunNew', 'TH Sarabun PSK', var(--font-sarabun), 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: "14pt",
                    lineHeight: 1.35,
                  }}
                >
                  <div
                    className="report-preview-sheet"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Hint Footer */}
        <div className="px-6 py-2.5 bg-white border-t border-[#EADBCC] flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-[#555555] shrink-0 z-20 gap-2">
          <span>
            💡 <strong>คำแนะนำ:</strong> สามารถซูม, ค้นหา, บันทึกเป็นไฟล์ PDF หรือสั่งพิมพ์ได้จากแถบเครื่องมือของเอกสาร
          </span>
          {reportType && !isOfficialSaved && (
            <span className="text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              📌 หากต้องการออกรหัสราชการและ QR Code ให้กดปุ่ม <strong>"บันทึกรายงานฉบับสมบูรณ์"</strong> ด้านบน
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
