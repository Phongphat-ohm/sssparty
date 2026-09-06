"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  KeyRound,
  QrCode,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Delete,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { studentCheckInAction } from "@/actions/attendance-key";

// โหลด @yudiel/react-qr-scanner แบบ dynamic ป้องกัน SSR error
const QrScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex flex-col items-center justify-center bg-stone-900/90 text-white rounded-2xl gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-xs font-medium text-stone-300">กำลังเปิดกล้องสแกนเนอร์...</p>
      </div>
    ),
  }
);

interface ActiveSessionData {
  id: string;
  title: string;
  date: string;
  academicTerm: string;
  note?: string | null;
}

interface MyRecordData {
  status: string;
  checkedAt: string;
  checkInMethod?: string | null;
}

interface Props {
  initialSession: ActiveSessionData | null;
  initialRecord: MyRecordData | null;
  studentName: string;
  studentCode: string;
}

export function StudentCheckInClient({
  initialSession,
  initialRecord,
  studentName,
  studentCode,
}: Props) {
  // Mode: "numpad" | "scanner"
  const [activeTab, setActiveTab] = useState<"numpad" | "scanner">("numpad");
  const [keyDigits, setKeyDigits] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    studentName: string;
    checkedAt: string;
    distanceMeters?: number | null;
    hasLocation: boolean;
  } | null>(
    initialRecord
      ? {
          success: true,
          studentName,
          checkedAt: initialRecord.checkedAt,
          hasLocation: false,
        }
      : null
  );

  // Location state
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "unsupported"
  >("idle");

  // ขอพิกัดอย่างปลอดภัย
  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus("granted");
      },
      (err) => {
        console.log("Geolocation notice (optional):", err.message);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  // ลองขอตำแหน่งเบื้องหลังแบบไม่บังคับเมื่อเข้าหน้าเว็บ
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // ตรวจสอบ URL Search Params เผื่อสแกน QR Code จากกล้องมือถือแล้วเปิดเว็บพร้อมรหัส
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlKey = urlParams.get("key");
      if (urlKey && /^\d{6}$/.test(urlKey)) {
        setKeyDigits(urlKey.split(""));
        // auto submit if key is present from URL
        if (initialSession && !checkInResult) {
          handleSubmitKey(urlKey, "DYNAMIC_QR");
        }
      }
    }
  }, [initialSession, checkInResult]);

  // ฟังก์ชันส่งรหัสยืนยัน
  const handleSubmitKey = async (
    code: string,
    method: "DYNAMIC_KEY" | "DYNAMIC_QR" = "DYNAMIC_KEY"
  ) => {
    if (!initialSession) return;
    if (code.length !== 6) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await studentCheckInAction({
        sessionId: initialSession.id,
        key: code,
        coords,
        method,
      });

      if (res.success) {
        setCheckInResult({
          success: true,
          studentName: res.studentName || studentName,
          checkedAt: res.checkedAt || new Date().toISOString(),
          distanceMeters: res.distanceMeters,
          hasLocation: res.hasLocation || false,
        });
        // Haptic feedback (ถ้าอุปกรณ์รองรับ)
        if (typeof window !== "undefined" && window.navigator.vibrate) {
          window.navigator.vibrate([100, 50, 100]);
        }
      } else {
        setErrorMessage(res.message || "รหัส Key ไม่ถูกต้อง");
        setKeyDigits([]);
        if (typeof window !== "undefined" && window.navigator.vibrate) {
          window.navigator.vibrate(200);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
      setKeyDigits([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // แป้นกดตัวเลขบนหน้าจอ (Custom On-Screen Numpad)
  const handleNumpadPress = (num: string) => {
    if (isSubmitting || checkInResult) return;
    setErrorMessage(null);

    if (keyDigits.length < 6) {
      const newDigits = [...keyDigits, num];
      setKeyDigits(newDigits);

      // เมื่อครบ 6 ตัว ให้ Auto-Submit ทันที
      if (newDigits.length === 6) {
        handleSubmitKey(newDigits.join(""), "DYNAMIC_KEY");
      }
    }
  };

  // ปุ่มลบ
  const handleBackspace = () => {
    if (isSubmitting || checkInResult) return;
    setErrorMessage(null);
    setKeyDigits((prev) => prev.slice(0, -1));
  };

  // ปุ่มล้าง
  const handleClear = () => {
    if (isSubmitting || checkInResult) return;
    setErrorMessage(null);
    setKeyDigits([]);
  };

  // จัดการเมื่อกล้องสแกนพบ QR Code
  const handleQrScan = (detectedCodes: any) => {
    if (isSubmitting || checkInResult || !detectedCodes || detectedCodes.length === 0) return;
    const rawVal = detectedCodes[0]?.rawValue || "";
    
    // รูปแบบที่ 1: เป็นตัวเลข 6 หลักตรงๆ
    if (/^\d{6}$/.test(rawVal.trim())) {
      handleSubmitKey(rawVal.trim(), "DYNAMIC_QR");
      return;
    }

    // รูปแบบที่ 2: เป็น URL เช่น https://...?key=839214
    try {
      const url = new URL(rawVal);
      const urlKey = url.searchParams.get("key");
      if (urlKey && /^\d{6}$/.test(urlKey)) {
        handleSubmitKey(urlKey, "DYNAMIC_QR");
      }
    } catch {
      // ไม่ใช่ URL หรือตัวเลข
    }
  };

  // กรณีไม่มีรอบที่เปิดอยู่
  if (!initialSession) {
    return (
      <div className="max-w-md mx-auto p-4 sm:p-6 text-center">
        <div className="bg-white rounded-3xl p-8 border border-[#EBE3D5] shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#3F342B]">ยังไม่มีรอบเช็กชื่อที่เปิดรับ</h2>
          <p className="text-sm text-[#7A6A5C] leading-relaxed">
            ขณะนี้คุณครูยังไม่ได้เปิดระบบรับเช็กชื่อแบบ Real-Time หรือรอบก่อนหน้าปิดไปแล้ว
            กรุณารอคุณครูเปิดระบบบนหน้าจอโปรเจกเตอร์
          </p>
          <div className="pt-2">
            <Link
              href="/student/attendance"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5EFEB] text-[#5C4A3A] hover:bg-[#EBE3D5] font-semibold text-xs transition-colors"
            >
              <span>ดูประวัติการเข้าเรียน</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // กรณีเช็กชื่อสำเร็จแล้ว
  if (checkInResult) {
    const formattedTime = new Date(checkInResult.checkedAt).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-3xl p-8 border-2 border-emerald-300 shadow-sm text-center space-y-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-50 rounded-full blur-xl pointer-events-none" />
          
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              เช็กชื่อสำเร็จเรียบร้อยแล้ว
            </span>
            <h2 className="text-2xl font-bold text-[#3F342B] pt-1">
              {checkInResult.studentName}
            </h2>
            <p className="text-xs text-[#7A6A5C]">
              รหัสนักเรียน: {studentCode}
            </p>
          </div>

          <div className="bg-[#FAF7F2] rounded-2xl p-4 text-xs space-y-2 border border-[#EBE3D5]/80 text-left">
            <div className="flex justify-between items-center">
              <span className="text-[#7A6A5C]">รอบเช็กชื่อ:</span>
              <span className="font-bold text-[#3F342B]">{initialSession.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6A5C]">เวลาที่บันทึก:</span>
              <span className="font-bold text-[#3F342B]">{formattedTime} น.</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A6A5C]">สถานะการเข้าเรียน:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                มาเรียน (PRESENT)
              </span>
            </div>
            {checkInResult.hasLocation && checkInResult.distanceMeters !== undefined && (
              <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                <span className="text-[#7A6A5C] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  ระยะห่างจากห้องเรียน:
                </span>
                <span className="font-semibold text-[#3F342B]">
                  {checkInResult.distanceMeters !== null
                    ? `${checkInResult.distanceMeters} เมตร`
                    : "บันทึกพิกัดแล้ว"}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/student/dashboard"
              className="w-full py-3 px-4 rounded-xl bg-[#5C4A3A] text-white hover:bg-[#3F342B] font-bold text-xs transition-all shadow-xs"
            >
              กลับสู่หน้าหลัก
            </Link>
            <Link
              href="/student/attendance"
              className="w-full py-2.5 px-4 rounded-xl bg-transparent text-[#7A6A5C] hover:text-[#3F342B] font-semibold text-xs transition-colors"
            >
              ดูประวัติการเข้าเรียนทั้งหมด
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-4">
      {/* ส่วนหัวระบุรอบที่เปิดอยู่ */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-3xl p-5 border border-amber-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>รอบเช็กชื่อสดที่กำลังเปิดรับ</span>
        </div>
        <h1 className="text-lg font-bold text-[#3F342B] tracking-tight">
          {initialSession.title}
        </h1>
        <p className="text-xs text-[#7A6A5C] mt-0.5">
          ภาคเรียน {initialSession.academicTerm} • รหัสนักเรียน {studentCode} ({studentName})
        </p>
      </div>

      {/* แถบสลับโหมด: แป้นตัวเลข vs กล้องสแกน QR */}
      <div className="bg-[#FAF7F2] p-1 rounded-2xl border border-[#EBE3D5] flex items-center">
        <button
          type="button"
          onClick={() => {
            setActiveTab("numpad");
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "numpad"
              ? "bg-white text-[#3F342B] shadow-xs"
              : "text-[#7A6A5C] hover:text-[#3F342B]"
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span>กรอกรหัส Key 6 หลัก</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("scanner");
            setErrorMessage(null);
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "scanner"
              ? "bg-white text-[#3F342B] shadow-xs"
              : "text-[#7A6A5C] hover:text-[#3F342B]"
          }`}
        >
          <QrCode className="w-4 h-4 text-orange-600" />
          <span>สแกน QR Code</span>
        </button>
      </div>

      {/* ข้อความแจ้งเตือนความผิดพลาด */}
      {errorMessage && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs flex items-start gap-2 border border-red-200 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="leading-relaxed">
            <span className="font-bold">เช็กชื่อไม่สำเร็จ: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* แท็บที่ 1: แป้นตัวเลขบนหน้าจอ (Custom Numpad + OTP Boxes) */}
      {activeTab === "numpad" && (
        <div className="bg-white rounded-3xl p-5 border border-[#EBE3D5] shadow-xs space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium text-[#7A6A5C]">
              ดูรหัส 6 หลักที่กำลังหมุนเวียนบนหน้าจอโปรเจกเตอร์ของครู
            </p>
          </div>

          {/* OTP 6 Boxes */}
          <div className="flex justify-center items-center gap-2 sm:gap-3 py-1">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = keyDigits[index];
              const isCurrent = keyDigits.length === index;
              return (
                <div
                  key={index}
                  className={`w-11 h-13 sm:w-13 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all ${
                    digit
                      ? "bg-amber-50 text-amber-900 border-2 border-amber-400 shadow-2xs scale-105"
                      : isCurrent
                      ? "bg-white border-2 border-[#5C4A3A] shadow-xs ring-4 ring-amber-100/70"
                      : "bg-[#FAF7F2] border border-[#EBE3D5] text-stone-300"
                  }`}
                >
                  {digit || (isCurrent ? <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> : "")}
                </div>
              );
            })}
          </div>

          {isSubmitting && (
            <div className="py-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังตรวจสอบรหัสและบันทึกการเช็กชื่อ...</span>
            </div>
          )}

          {/* On-Screen Custom Numpad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleNumpadPress(num)}
                className="h-13 sm:h-15 rounded-2xl bg-[#FAF7F2] hover:bg-amber-50 active:bg-amber-100 text-xl sm:text-2xl font-bold text-[#3F342B] border border-[#EBE3D5] shadow-2xs active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {num}
              </button>
            ))}

            {/* ปุ่มล้าง (C) */}
            <button
              type="button"
              disabled={isSubmitting || keyDigits.length === 0}
              onClick={handleClear}
              title="ล้างรหัสทั้งหมด"
              className="h-13 sm:h-15 rounded-2xl bg-[#FAF7F2] hover:bg-stone-200 active:bg-stone-300 text-xs font-bold text-[#7A6A5C] border border-[#EBE3D5] active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* เลข 0 */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleNumpadPress("0")}
              className="h-13 sm:h-15 rounded-2xl bg-[#FAF7F2] hover:bg-amber-50 active:bg-amber-100 text-xl sm:text-2xl font-bold text-[#3F342B] border border-[#EBE3D5] shadow-2xs active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>

            {/* ปุ่มลบตัวหลัง (Backspace) */}
            <button
              type="button"
              disabled={isSubmitting || keyDigits.length === 0}
              onClick={handleBackspace}
              title="ลบตัวเลขตัวล่าสุด"
              className="h-13 sm:h-15 rounded-2xl bg-[#FAF7F2] hover:bg-red-50 active:bg-red-100 text-red-600 border border-[#EBE3D5] active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* แท็บที่ 2: กล้องสแกนเนอร์ (@yudiel/react-qr-scanner) */}
      {activeTab === "scanner" && (
        <div className="bg-white rounded-3xl p-5 border border-[#EBE3D5] shadow-xs space-y-3">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-[#3F342B]">
              เล็งกล้องไปที่ QR Code บนจอโปรเจกเตอร์
            </h3>
            <p className="text-xs text-[#7A6A5C]">
              ระบบจะอ่านรหัสและยืนยันการเช็กชื่อให้อัตโนมัติทันที
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-inner bg-black relative">
            <QrScanner
              onScan={handleQrScan}
              onError={(error) => console.log("Scanner error:", error)}
              styles={{
                container: { width: "100%", height: "280px" },
                video: { width: "100%", height: "100%", objectFit: "cover" },
              }}
            />
          </div>

          {isSubmitting && (
            <div className="py-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>ตรวจพบ QR Code! กำลังบันทึกการเข้าเรียน...</span>
            </div>
          )}
        </div>
      )}

      {/* กล่องแจ้งนโยบายความเป็นส่วนตัวและสิทธิ์การเก็บพิกัด (Safe & Transparent Notice) */}
      <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#EBE3D5] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[#3F342B]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>นโยบายความเป็นส่วนตัวและการจัดเก็บพิกัด</span>
          </div>
          {locationStatus === "granted" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              📍 พร้อมแนบพิกัด
            </span>
          )}
          {locationStatus === "denied" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
              ⚪ ข้ามการระบุพิกัด
            </span>
          )}
        </div>

        <p className="text-[#7A6A5C] leading-relaxed">
          ระบบจะขอพิกัดเพื่อใช้ยืนยันว่าคุณอยู่ในบริเวณคาบเรียนชุมนุมเท่านั้น
          ข้อมูลจะถูกจัดเก็บในฐานข้อมูลอย่างปลอดภัย และไม่มีการแชร์หรือติดตามตำแหน่งใดๆ ทั้งสิ้น
          (หากอุปกรณ์ของคุณไม่สะดวกเปิดพิกัด <strong>ยังคงสามารถเช็กชื่อได้ตามปกติ 100%</strong>)
        </p>

        {locationStatus !== "granted" && (
          <div className="pt-1">
            <button
              type="button"
              onClick={requestLocation}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-900 underline flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              <span>{locationStatus === "requesting" ? "กำลังค้นหาพิกัด..." : "คลิกเพื่อแชร์พิกัดยืนยันห้องเรียน"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
