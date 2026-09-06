"use client";

import React, { useEffect, useState, useRef } from "react";
import { X, Printer, Download, ExternalLink, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { printDirectDocument } from "@/lib/export/print-helper";

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename?: string;
  orientation?: "portrait" | "landscape";
  pdfApiUrl?: string;
  htmlContent?: string;
}

export function PdfReportModal({
  isOpen,
  onClose,
  title,
  filename = "รายงาน",
  orientation = "portrait",
  pdfApiUrl,
  htmlContent,
}: PdfReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ล็อกไม่ให้หน้าเว็บด้านหลังเลื่อน (Lock body scroll) ขณะเปิด Modal
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ฟังก์ชันดาวน์โหลด / โหลด PDF จาก pdfApiUrl
  const fetchPdf = async () => {
    if (!pdfApiUrl) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(pdfApiUrl);
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
  };

  // ดึง PDF เมื่อเปิด Modal และมี pdfApiUrl
  useEffect(() => {
    if (isOpen && pdfApiUrl) {
      fetchPdf();
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [isOpen, pdfApiUrl]);

  if (!isOpen) return null;

  // การสั่งพิมพ์
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

  // การดาวน์โหลดไฟล์ PDF
  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // เปิดในแท็บใหม่
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
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 bg-white border-b border-[#EADBCC] shadow-2xs shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-xs font-sarabun">
              PDF
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#111111] flex items-center gap-2">
                <span>{title}</span>
                {pdfApiUrl && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                    PDF Engine
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#666666]">
                เอกสารทางการขาว-ดำ (Font: TH Sarabun New) ขนาด A4 ({isLandscape ? "แนวนอน Landscape" : "แนวตั้ง Portrait"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            {pdfBlobUrl && !loading && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#3F342B] bg-[#FAF0E1] hover:bg-[#EADBCC] active:scale-95 transition-all cursor-pointer border border-[#D9CABB]"
                title="ดาวน์โหลดไฟล์ PDF เก็บไว้ในเครื่อง"
              >
                <Download className="w-3.5 h-3.5 text-[#8C5D23]" />
                <span>ดาวน์โหลด PDF</span>
              </button>
            )}

            {/* Open in New Tab Button */}
            {pdfBlobUrl && !loading && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#555555] bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all cursor-pointer"
                title="เปิดเอกสาร PDF ในแท็บใหม่เต็มจอ"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เปิดแท็บใหม่</span>
              </button>
            )}

            {/* Primary Print Button */}
            {(!loading || htmlContent) && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={Boolean(loading || (pdfApiUrl && !pdfBlobUrl))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#111111] hover:bg-[#333333] active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* กรณี 1: กำลังสร้างเอกสาร (Loading State) */}
          {loading && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/95 rounded-3xl shadow-2xl border border-white/50 max-w-md w-full animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-[#FAF0E1] flex items-center justify-center text-[#8C5D23] mb-4 shadow-xs">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-[#111111] mb-1">
                กำลังสร้างเอกสารรายงานทางการ...
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed mb-4">
                ระบบกำลังจัดเตรียมและประมวลผลเอกสาร PDF ทางการตามมาตรฐานแบบฟอร์ม
              </p>
              <div className="w-full bg-[#FAF6F0] rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#D9A441] h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {/* กรณี 2: เกิดข้อผิดพลาด (Error State) */}
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
                onClick={fetchPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#111111] hover:bg-[#333333] transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          )}

          {/* กรณี 3: แสดงผลเอกสาร PDF ผ่าน <iframe> */}
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

          {/* กรณี 4: Fallback แสดงผล HTML Paper Sheet เมื่อไม่มี pdfApiUrl */}
          {!pdfApiUrl && htmlContent && (
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

        {/* Bottom Hint Footer (Fixed) */}
        <div className="px-6 py-2.5 bg-white border-t border-[#EADBCC] text-center text-[11px] sm:text-xs text-[#555555] shrink-0 z-20">
          💡 <strong>คำแนะนำ:</strong> สามารถซูม, ค้นหา, บันทึกเป็นไฟล์ PDF หรือสั่งพิมพ์ได้จากแถบเครื่องมือของเอกสารในหน้านี้โดยตรง
        </div>
      </div>
    </div>
  );
}
