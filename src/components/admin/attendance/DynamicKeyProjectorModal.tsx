"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import {
  X,
  Volume2,
  VolumeX,
  MapPin,
  Play,
  Square,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
  UserX,
  Loader2,
  RefreshCw,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import {
  startDynamicKeySessionAction,
  stopDynamicKeySessionAction,
  batchMarkUncheckedAbsentAction,
} from "@/actions/attendance-key";
import { markAllAttendanceStatusAction } from "@/actions/attendance";
import { generateDynamicKey } from "@/lib/attendance/dynamic-key";
import { showCozySuccess, showCozyError, showCozyConfirm } from "@/lib/ui/swal";

interface ProjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  academicTerm: string;
  totalStudents: number;
  initialIsActive?: boolean;
  initialKeySecret?: string | null;
  initialCenterCoords?: { latitude: number; longitude: number; expectedRadius?: number } | null;
  onCheckInEvent?: (event?: LiveCheckInItem) => void;
}

interface LiveCheckInItem {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  studentNumber: number;
  checkedAt: string;
  checkInMethod: string;
  hasLocation: boolean;
  distanceFromSession?: number | null;
}

// Web Audio API Beep (เสียงติ๊งเมื่อนักเรียนเช็กชื่อ ไม่ต้องพึ่งไฟล์ภายนอก)
function playDingSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Note A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // Ramp to E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore audio failure
  }
}

export function DynamicKeyProjectorModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  academicTerm,
  totalStudents,
  initialIsActive = false,
  initialKeySecret = null,
  initialCenterCoords = null,
  onCheckInEvent,
}: ProjectorModalProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [keySecret, setKeySecret] = useState<string | null>(initialKeySecret);
  const [currentKey, setCurrentKey] = useState<string>("------");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live feed & stats
  const [presentCount, setPresentCount] = useState(0);
  const [recentCheckins, setRecentCheckins] = useState<LiveCheckInItem[]>([]);
  const [centerCoords, setCenterCoords] = useState(initialCenterCoords);
  const [isPinningLocation, setIsPinningLocation] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // เมื่อเปิด Modal ขึ้นมา ให้เริ่มรับเช็กชื่อทันทีโดยอัตโนมัติหากยังไม่ได้เริ่ม
  useEffect(() => {
    if (isOpen && !isActive) {
      startDynamicKeySessionAction(sessionId, centerCoords).then((res) => {
        if (res.success) {
          setIsActive(true);
          setKeySecret(res.keySecret || null);
        }
      });
    }
  }, [isOpen, isActive, sessionId, centerCoords]);

  // อัปเดตรหัส Key และ QR Code ทุก 1 วินาที
  useEffect(() => {
    if (!isActive || !keySecret) {
      setCurrentKey("------");
      setRemainingSeconds(30);
      setQrDataUrl("");
      return;
    }

    const updateCycle = async () => {
      const { key, remainingSeconds } = generateDynamicKey(keySecret);
      setCurrentKey(key);
      setRemainingSeconds(remainingSeconds);

      // สร้าง QR Code URL คมชัดพิเศษความละเอียดสูง
      if (typeof window !== "undefined") {
        const checkinUrl = `${window.location.origin}/student/checkin?sessionId=${sessionId}&key=${key}`;
        try {
          const url = await QRCode.toDataURL(checkinUrl, {
            width: 800,
            margin: 1,
            errorCorrectionLevel: "M",
            color: {
              dark: "#231B15",
              light: "#FFFFFF",
            },
          });
          setQrDataUrl(url);
        } catch (err) {
          console.error("QR Code generation error:", err);
        }
      }
    };

    updateCycle();
    const interval = setInterval(updateCycle, 1000);
    return () => clearInterval(interval);
  }, [isActive, keySecret, sessionId]);

  // เชื่อมต่อ Real-Time SSE Stream พร้อม Polling Fallback
  useEffect(() => {
    if (!isOpen) return;

    // 1. ฟังก์ชัน Polling สำหรับซิงก์ข้อมูลเป็นระยะ ป้องกันกรณี SSE หลุดหรือเน็ตสวิง
    const syncStatus = async () => {
      try {
        const res = await fetch(`/api/attendance/live?sessionId=${sessionId}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setPresentCount(data.presentCount ?? 0);
            if (data.recentCheckins) {
              setRecentCheckins(data.recentCheckins);
            }
            if (data.isKeyActive !== undefined) {
              setIsActive(data.isKeyActive);
            }
          }
        }
      } catch {
        // ignore polling error
      }
    };

    syncStatus();
    const pollInterval = setInterval(syncStatus, 3000);

    // 2. เชื่อมต่อ Server-Sent Events (SSE) เพื่อรับข้อมูลแบบ Real-Time ทันที
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/attendance/live?sessionId=${sessionId}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "INITIAL_STATE") {
            setPresentCount(data.presentCount ?? 0);
            if (data.recentCheckins) {
              setRecentCheckins(data.recentCheckins);
            }
            if (data.isKeyActive !== undefined) {
              setIsActive(data.isKeyActive);
            }
          } else if (data.type === "NEW_CHECKIN") {
            // ป้องกันการนับซ้ำถ้ามี studentId นี้อยู่แล้ว
            setRecentCheckins((prev) => {
              if (prev.some((item) => item.studentId === data.studentId)) {
                return prev;
              }
              setPresentCount((c) => c + 1);
              return [data, ...prev.slice(0, 24)];
            });

            if (soundEnabled) {
              playDingSound();
            }

            if (onCheckInEvent) {
              onCheckInEvent(data);
            }
          } else if (data.type === "SESSION_STATE_CHANGED") {
            setIsActive(data.isKeyActive);
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        // SSE หลุด ระบบจะใช้ Polling Fallback ดึงต่ออย่างต่อเนื่อง
      };
    } catch (e) {
      console.error("SSE connection error:", e);
    }

    return () => {
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isOpen, sessionId, soundEnabled, onCheckInEvent]);

  // เปิด/ปิดระบบเช็กชื่อ
  const handleToggleActive = async () => {
    setIsBusy(true);
    try {
      if (!isActive) {
        // เปิดระบบ
        const res = await startDynamicKeySessionAction(sessionId, centerCoords);
        if (res.success) {
          setIsActive(true);
          setKeySecret(res.keySecret || null);
          await showCozySuccess("เปิดรับการเช็กชื่อแล้ว!", "รหัส Key 6 หลักและ QR Code เริ่มหมุนเวียนแล้ว");
        } else {
          await showCozyError("เกิดข้อผิดพลาด", res.message);
        }
      } else {
        // ปิดระบบ
        const confirmed = await showCozyConfirm(
          "ต้องการปิดรับการเช็กชื่อ?",
          "นักเรียนจะไม่สามารถใช้รหัส Key หรือ QR Code เช็กชื่อได้อีกจนกว่าจะเปิดใหม่"
        );
        if (confirmed) {
          const res = await stopDynamicKeySessionAction(sessionId);
          if (res.success) {
            setIsActive(false);
            await showCozySuccess("ปิดระบบเรียบร้อย", res.message);
          } else {
            await showCozyError("เกิดข้อผิดพลาด", res.message);
          }
        }
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // ปักหมุดพิกัดห้องเรียนปัจจุบัน
  const handlePinCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      showCozyError("อุปกรณ์ไม่รองรับ", "เบราว์เซอร์ไม่รองรับการดึงพิกัด GPS");
      return;
    }

    setIsPinningLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsPinningLocation(false);
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          expectedRadius: 100,
        };
        setCenterCoords(coords);

        // บันทึกลงฐานข้อมูล
        if (isActive) {
          await startDynamicKeySessionAction(sessionId, coords);
        }
        await showCozySuccess(
          "ปักหมุดสำเร็จ!",
          `บันทึกพิกัดห้องเรียนเรียบร้อย (ละติจูด ${coords.latitude.toFixed(5)}, ลองจิจูด ${coords.longitude.toFixed(5)})`
        );
      },
      (err) => {
        setIsPinningLocation(false);
        showCozyError("ดึงพิกัดไม่สำเร็จ", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ปรับคนที่ยังไม่เช็กให้เป็น ขาดเรียน
  const handleMarkUncheckedAbsent = async () => {
    const confirmed = await showCozyConfirm(
      "ปรับผู้ที่ยังไม่เช็กชื่อเป็น ขาดเรียน?",
      "ระบบจะปรับสถานะของนักเรียนทุกคนที่ยังไม่ได้เช็กชื่อในรอบนี้ให้เป็น 'ขาดเรียน (ABSENT)' โดยอัตโนมัติ"
    );
    if (!confirmed) return;

    setIsBusy(true);
    try {
      const res = await batchMarkUncheckedAbsentAction(sessionId);
      if (res.success) {
        await showCozySuccess("บันทึกสำเร็จ", res.message);
        if (onCheckInEvent) onCheckInEvent();
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // รีเซ็ตทุกคนเป็น ขาดเรียน เพื่อเริ่มนับการเช็กชื่อใหม่ (กรณีรอบถูกสร้างไว้ก่อนหน้า)
  const handleResetAllAbsent = async () => {
    const confirmed = await showCozyConfirm(
      "รีเซ็ตทุกคนเป็น 'ขาดเรียน' เพื่อเริ่มเช็กชื่อใหม่?",
      "ระบบจะปรับสถานะทุกคนในรอบนี้เป็น 'ขาดเรียน (ABSENT)' เพื่อเตรียมพร้อมให้นักเรียนเริ่มสแกน QR Code หรือกรอก Key ใหม่"
    );
    if (!confirmed) return;

    setIsBusy(true);
    try {
      const res = await markAllAttendanceStatusAction(sessionId, "ABSENT");
      if (res.success) {
        setPresentCount(0);
        setRecentCheckins([]);
        await showCozySuccess("รีเซ็ตสำเร็จ", "สถานะทุกคนถูกปรับเป็นขาดเรียน พร้อมเริ่มการเช็กชื่อใหม่แล้ว");
        if (onCheckInEvent) onCheckInEvent();
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const progressCircleOffset = 283 - (283 * (30 - remainingSeconds)) / 30;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col text-white select-none overflow-y-auto"
    >
      {/* Top Projector Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/70 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-lg shadow-lg">
            3S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-stone-100">
                {sessionTitle}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 font-medium">
                ภาคเรียน {academicTerm}
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  กำลังเปิดรับเช็กชื่อ Real-Time
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-400">
                  ระบบปิดอยู่
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              โหมดฉายจอโปรเจกเตอร์สำหรับห้องเรียน (Projector Studio) • ชุมนุมสื่อสร้างสรรค์
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* ปักหมุดห้องเรียน */}
          <button
            type="button"
            disabled={isPinningLocation}
            onClick={handlePinCurrentLocation}
            title={
              centerCoords
                ? `ปักหมุดแล้ว (${centerCoords.latitude.toFixed(4)}, ${centerCoords.longitude.toFixed(4)})`
                : "ปักหมุดพิกัดห้องเรียนปัจจุบันเพื่อตรวจย้อนหลัง"
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              centerCoords
                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                : "bg-stone-800 hover:bg-stone-700 text-stone-300"
            }`}
          >
            {isPinningLocation ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {centerCoords ? "ปักหมุดห้องเรียนแล้ว" : "ปักหมุดพิกัด"}
            </span>
          </button>

          {/* ปิด/เปิดเสียง */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title={soundEnabled ? "ปิดเสียงแจ้งเตือน" : "เปิดเสียงแจ้งเตือน"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-stone-500" />
            )}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="เต็มจอ"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* ปุ่มเริ่ม/หยุด */}
          <button
            type="button"
            disabled={isBusy}
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
              isActive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>ปิดรับเช็กชื่อ</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>เริ่มรับเช็กชื่อ</span>
              </>
            )}
          </button>

          {/* ปุ่มปิด Modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Projector Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 max-w-7xl mx-auto w-full items-center">
        {/* Left 7 Cols: Key 6 หลัก + QR Code + นับถอยหลัง 30 วิ */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6 text-center">
          {/* Dynamic Key 6 หลัก + ตัวนับถอยหลัง 30 วิ */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                รหัส Key 6 หลักประจำรอบ (เปลี่ยนใหม่ทุก 30 วินาที)
              </span>

              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                <div className="flex gap-1.5 sm:gap-2 bg-stone-900/90 p-2 sm:p-3 rounded-2xl border border-stone-700 shadow-xl">
                  {currentKey.slice(0, 3).split("").map((digit, idx) => (
                    <span
                      key={idx}
                      className="w-10 h-14 sm:w-13 sm:h-18 rounded-xl bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-2xl sm:text-4xl font-black flex items-center justify-center shadow-inner"
                    >
                      {digit}
                    </span>
                  ))}
                </div>

                <span className="text-xl sm:text-2xl font-bold text-stone-600">-</span>

                <div className="flex gap-1.5 sm:gap-2 bg-stone-900/90 p-2 sm:p-3 rounded-2xl border border-stone-700 shadow-xl">
                  {currentKey.slice(3, 6).split("").map((digit, idx) => (
                    <span
                      key={idx}
                      className="w-10 h-14 sm:w-13 sm:h-18 rounded-xl bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-2xl sm:text-4xl font-black flex items-center justify-center shadow-inner"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Countdown Circle */}
            <div className="flex items-center gap-3 bg-stone-900/80 px-4 py-3 rounded-2xl border border-stone-800 shadow-md">
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-stone-800"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={138}
                    strokeDashoffset={138 - (138 * remainingSeconds) / 30}
                    className="text-amber-500 transition-all duration-1000 ease-linear"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-black font-mono text-amber-300">
                  {remainingSeconds}s
                </span>
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-stone-200">
                  นับถอยหลังรหัส
                </h4>
                <p className="text-[10px] text-stone-400">
                  หมุนเวียนทุก 30 วินาที
                </p>
              </div>
            </div>
          </div>

          {/* QR Code ขนาดยักษ์ คมชัดพิเศษ */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-2xl border-4 border-amber-400/70 relative transition-transform hover:scale-[1.01]">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Check-in QR Code"
                className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain rounded-2xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 flex flex-col items-center justify-center bg-stone-100 text-stone-500 rounded-2xl gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
                <p className="text-xs font-semibold">กำลังสร้าง QR Code ขนาดยักษ์...</p>
              </div>
            )}
          </div>

          {/* กล่องแสดงขั้นตอนการเช็กชื่ออย่างชัดเจนตั้งแต่แรก (Step-by-Step Instructions) */}
          <div className="w-full max-w-xl bg-stone-900/90 rounded-2xl p-4 border border-stone-800 text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                วิธีการเช็กชื่อเข้าเรียนสำหรับนักเรียน (เลือกได้ 2 วิธี)
              </span>
              <span className="text-[11px] text-amber-400 font-mono bg-stone-950 px-2.5 py-0.5 rounded-md border border-stone-800">
                /student/checkin
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-stone-100">สแกน QR Code (แนะนำ)</p>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    เปิดกล้องมือถือสแกน QR Code ขนาดใหญ่บนจอ ระบบจะเปิดหน้าเว็บและเช็กชื่อให้อัตโนมัติทันที
                  </p>
                </div>
              </div>

              <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-stone-100">หรือกดเลข 6 หลักบนจอ</p>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    เข้าสู่ระบบกดเมนู <strong className="text-amber-300">เช็กชื่อสด</strong> แล้วกดตัวเลข 6 หลักตามหน้าจอ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Live Real-Time Feed & Counter */}
        <div className="lg:col-span-5 flex flex-col space-y-4 h-full max-h-[620px]">
          {/* Live Attendance Counter */}
          <div className="bg-stone-900/80 rounded-3xl p-5 border border-stone-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-stone-200">ยอดการเช็กชื่อสด</span>
              </div>
              <span className="text-2xl font-black text-amber-400">
                {presentCount} <span className="text-sm font-normal text-stone-400">/ {totalStudents} คน</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs text-stone-400">
              <span>ความคืบหน้า: {percentage}%</span>
              <span>ยังไม่เช็ก: {Math.max(0, totalStudents - presentCount)} คน</span>
            </div>
          </div>

          {/* Real-Time Live Feed Card */}
          <div className="flex-1 bg-stone-900/80 rounded-3xl p-5 border border-stone-800 shadow-xl flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-bold text-stone-200">
                  รายชื่อที่เพิ่งเช็กชื่อสด (Live Feed)
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">
                ล่าสุด {recentCheckins.length} คน
              </span>
            </div>

            {/* Live Feed List */}
            <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
              {recentCheckins.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-stone-500 space-y-2">
                  <Clock className="w-8 h-8 stroke-1 text-stone-600" />
                  <p className="text-xs">กำลังรอนักเรียนคนแรกเช็กชื่อ...</p>
                </div>
              ) : (
                recentCheckins.map((item, idx) => {
                  const checkTime = new Date(item.checkedAt).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <div
                      key={`${item.studentId}-${idx}`}
                      className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-right-4 duration-300"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-100 truncate">
                            {item.studentName}
                          </p>
                          <p className="text-[11px] text-stone-400 truncate">
                            {item.className} เลขที่ {item.studentNumber} ({item.studentCode})
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-bold text-amber-300 block">
                          {checkTime}
                        </span>
                        {item.hasLocation ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 justify-end">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>
                              {item.distanceFromSession !== null && item.distanceFromSession !== undefined
                                ? `${item.distanceFromSession}ม.`
                                : "มีพิกัด"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500">⚪ ไม่มีพิกัด</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick End Session Action */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleResetAllAbsent}
              title="ปรับทุกคนเป็นขาดเรียนเพื่อเริ่มนับใหม่อีกครั้ง"
              className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800/80 hover:bg-amber-950/80 hover:border-amber-700 border border-stone-700 text-stone-300 hover:text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>รีเซ็ตเริ่มนับใหม่</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleMarkUncheckedAbsent}
              className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800/80 hover:bg-rose-950/80 hover:border-rose-800 border border-stone-700 text-stone-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <UserX className="w-3.5 h-3.5 text-rose-400" />
              <span>ปรับคนค้างเป็นขาด</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
