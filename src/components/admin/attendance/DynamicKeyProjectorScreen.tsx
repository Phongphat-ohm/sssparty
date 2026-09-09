"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Map,
} from "lucide-react";
import {
  startDynamicKeySessionAction,
  stopDynamicKeySessionAction,
  batchMarkUncheckedAbsentAction,
} from "@/actions/attendance-key";
import { formatThaiTime } from "@/lib/utils/date-thai";
import { generateDynamicKey } from "@/lib/attendance/dynamic-key";
import { showCozySuccess, showCozyError, showCozyConfirm } from "@/lib/ui/swal";
import { ClassroomMapPickerModal } from "./ClassroomMapPickerModal";
import { StudentAttendanceMapModal } from "./StudentAttendanceMapModal";
import { StudentMapRecord } from "./StudentAttendanceMap";

interface ProjectorScreenProps {
  sessionId: string;
  sessionTitle: string;
  academicTerm: string;
  totalStudents: number;
  initialIsActive?: boolean;
  initialKeySecret?: string | null;
  initialCenterCoords?: { latitude: number; longitude: number; expectedRadius?: number } | null;
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
  latitude?: number | null;
  longitude?: number | null;
  distanceFromSession?: number | null;
}

// Web Audio API Beep (เสียงติ๊งเมื่อนักเรียนเช็กชื่อ)
function playDingSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

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

export function DynamicKeyProjectorScreen({
  sessionId,
  sessionTitle,
  academicTerm,
  totalStudents,
  initialIsActive = false,
  initialKeySecret = null,
  initialCenterCoords = null,
}: ProjectorScreenProps) {
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
  const [allStudentsMapRecords, setAllStudentsMapRecords] = useState<StudentMapRecord[]>([]);

  // Location & Map Modals
  const [centerCoords, setCenterCoords] = useState(initialCenterCoords);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [isStudentMapOpen, setIsStudentMapOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const lastGeneratedKeyRef = useRef<string>("");

  // อัปเดตรหัส Key และ QR Code ทุก 1 วินาที
  useEffect(() => {
    if (!isActive || !keySecret) {
      setCurrentKey("------");
      setRemainingSeconds(30);
      setQrDataUrl("");
      lastGeneratedKeyRef.current = "";
      return;
    }

    const updateCycle = async () => {
      const { key, remainingSeconds } = generateDynamicKey(keySecret);
      setCurrentKey(key);
      setRemainingSeconds(remainingSeconds);

      if (lastGeneratedKeyRef.current !== key && typeof window !== "undefined") {
        lastGeneratedKeyRef.current = key;
        const checkinUrl = `${window.location.origin}/student/checkin?sessionId=${sessionId}&key=${key}`;
        try {
          const url = await QRCode.toDataURL(checkinUrl, {
            width: 900,
            margin: 2,
            color: {
              dark: "#0C0A09",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "H",
          });
          setQrDataUrl(url);
        } catch (err) {
          console.error("QR Code generation error:", err);
        }
      }
    };

    updateCycle();
    const timer = setInterval(updateCycle, 1000);
    return () => clearInterval(timer);
  }, [isActive, keySecret, sessionId]);

  // Polling และเชื่อมต่อ SSE รับข้อมูลแบบสด
  useEffect(() => {
    const syncStatus = async () => {
      try {
        const res = await fetch(`/api/attendance/live?sessionId=${sessionId}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data.isKeyActive !== undefined) {
            setIsActive(data.isKeyActive);
            if (!data.isKeyActive) {
              setKeySecret(null);
            } else if (data.keySecret) {
              setKeySecret(data.keySecret);
            }
          }
          if (data.presentCount !== undefined) {
            setPresentCount(data.presentCount);
          }
          if (data.recentCheckins) {
            setRecentCheckins(data.recentCheckins);
          }
          if (data.allRecords) {
            setAllStudentsMapRecords(
              data.allRecords.map((r: any) => ({
                studentId: r.studentId,
                studentCode: r.studentCode || "",
                studentName: r.studentName || "",
                className: r.className || "",
                studentNumber: r.studentNumber || 0,
                status: r.status,
                checkedAt: r.checkedAt,
                checkInMethod: r.checkInMethod,
                latitude: r.latitude,
                longitude: r.longitude,
                locationAccuracy: r.locationAccuracy,
                distanceFromSession: r.distanceFromSession,
                hasLocation: r.hasLocation,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Projector sync error:", err);
      }
    };

    syncStatus();
    const pollInterval = setInterval(syncStatus, 3000);

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
              if (!data.isKeyActive) {
                setKeySecret(null);
                setCurrentKey("------");
                setQrDataUrl("");
              } else if (data.keySecret) {
                setKeySecret(data.keySecret);
              }
            }
          } else if (data.type === "NEW_CHECKIN") {
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
          }
        } catch {
          // ignore parse error
        }
      };
    } catch {
      // ignore sse connect error
    }

    return () => {
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [sessionId, soundEnabled]);

  // สลับโหมดเต็มจอ
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // เริ่ม/หยุดการเช็กชื่อ
  const handleToggleActive = async () => {
    setIsBusy(true);
    try {
      if (!isActive) {
        const res = await startDynamicKeySessionAction(sessionId, centerCoords);
        if (res.success) {
          setIsActive(true);
          setKeySecret(res.keySecret || null);
          if (res.currentKey) setCurrentKey(res.currentKey);
          if (res.remainingSeconds) setRemainingSeconds(res.remainingSeconds);
          await showCozySuccess("เปิดรับการเช็กชื่อแล้ว!", "รหัส Key 6 หลักและ QR Code เริ่มหมุนเวียนแล้ว");
        } else {
          await showCozyError("เกิดข้อผิดพลาด", res.message);
        }
      } else {
        const confirmed = await showCozyConfirm(
          "ปิดรับการเช็กชื่อรอบนี้?",
          "นักเรียนจะไม่สามารถใช้รหัส Key หรือ QR Code เช็กชื่อได้อีกจนกว่าจะเปิดใหม่"
        );
        if (!confirmed.isConfirmed) {
          setIsBusy(false);
          return;
        }

        const res = await stopDynamicKeySessionAction(sessionId);
        if (res.success) {
          setIsActive(false);
          setKeySecret(null);
          setCurrentKey("------");
          setQrDataUrl("");
          await showCozySuccess("ปิดระบบเรียบร้อย", res.message);
        } else {
          await showCozyError("เกิดข้อผิดพลาด", res.message);
        }
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // ปรับคนที่ยังไม่เช็กให้เป็น ขาดเรียน
  const handleMarkUncheckedAbsent = async () => {
    const confirmed = await showCozyConfirm(
      "ปรับผู้ที่ยังไม่เช็กชื่อเป็น ขาดเรียน?",
      "ระบบจะปรับสถานะของนักเรียนทุกคนที่ยังไม่ได้เช็กชื่อในรอบนี้ให้เป็น 'ขาดเรียน (ABSENT)' โดยอัตโนมัติ"
    );
    if (!confirmed.isConfirmed) return;

    setIsBusy(true);
    try {
      const res = await batchMarkUncheckedAbsentAction(sessionId);
      if (res.success) {
        await showCozySuccess("สำเร็จ!", res.message);
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // คำนวณเปอร์เซ็นต์
  const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const timerDashOffset = (remainingSeconds / 30) * 100;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-stone-950 text-stone-100 flex flex-col select-none overflow-x-hidden font-sans"
    >
      {/* Top Projector Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/attendance/${sessionId}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all text-xs font-bold"
            title="กลับไปยังหน้าตารางเช็กชื่อ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">หน้าตารางเช็กชื่อ</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-amber-400 truncate max-w-xs sm:max-w-md">
                {sessionTitle}
              </h1>
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  กำลังเปิดรับสด
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-400">
                  ระบบปิดอยู่
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400">
              โหมดฉายจอโปรเจกเตอร์ห้องเรียน (Projector Studio) • ภาคเรียน {academicTerm}
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* ปุ่มเปิด Interactive Map Picker สำหรับเลือกตำแหน่งห้องเรียน */}
          <button
            type="button"
            onClick={() => setIsMapPickerOpen(true)}
            title={
              centerCoords
                ? `ปักหมุดแล้ว (${centerCoords.latitude.toFixed(4)}, ${centerCoords.longitude.toFixed(4)}) - คลิกเพื่อแก้ไขบนแผนที่`
                : "เปิดแผนที่เพื่อเลือกตำแหน่งห้องเรียนอ้างอิง"
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              centerCoords
                ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                : "bg-stone-800 hover:bg-stone-700 text-stone-300"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">
              {centerCoords ? "พิกัดห้องเรียน (แผนที่)" : "ปักหมุดห้องเรียน"}
            </span>
          </button>

          {/* ปุ่มเปิดแผนที่แสดงหมุดนักเรียน */}
          <button
            type="button"
            onClick={() => setIsStudentMapOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 transition-all"
            title="ดูแผนที่หมุดตำแหน่งของนักเรียนทุกคน"
          >
            <Map className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">แผนที่นักเรียน</span>
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
            title="ขยายเต็มจอ"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
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
        </div>
      </div>

      {/* Main Projector Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-10 max-w-7xl mx-auto w-full items-center">
        {/* Left 7 Cols: Key 6 หลัก + QR Code + นับถอยหลัง 30 วิ */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6 text-center">
          {/* Dynamic Key 6 หลัก */}
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
                      className="w-10 h-14 sm:w-14 sm:h-20 rounded-xl bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-2xl sm:text-5xl font-black flex items-center justify-center shadow-inner"
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
                      className="w-10 h-14 sm:w-14 sm:h-20 rounded-xl bg-stone-950 border border-amber-500/40 text-amber-300 font-mono text-2xl sm:text-5xl font-black flex items-center justify-center shadow-inner"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Circular Countdown 30 วินาที */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-stone-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`transition-all duration-1000 ease-linear ${
                    remainingSeconds <= 5
                      ? "text-rose-500"
                      : remainingSeconds <= 10
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }`}
                  strokeDasharray="100, 100"
                  strokeDashoffset={100 - timerDashOffset}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span
                  className={`font-mono text-xl sm:text-2xl font-black ${
                    remainingSeconds <= 5
                      ? "text-rose-400 animate-ping"
                      : remainingSeconds <= 10
                      ? "text-amber-400"
                      : "text-stone-100"
                  }`}
                >
                  {remainingSeconds}
                </span>
                <span className="text-[9px] uppercase tracking-tighter text-stone-400">วินาที</span>
              </div>
            </div>
          </div>

          {/* QR Code ขนาดยักษ์ คมชัดพิเศษ */}
          <div className="relative p-5 sm:p-6 bg-white rounded-3xl shadow-2xl border-4 border-amber-500/30 flex items-center justify-center">
            {!isActive ? (
              <div className="w-64 h-64 sm:w-80 sm:h-80 flex flex-col items-center justify-center text-stone-400 space-y-3 bg-stone-100 rounded-2xl p-6 text-center">
                <Square className="w-12 h-12 text-stone-300" />
                <p className="text-sm font-bold text-stone-600">ระบบเช็กชื่อปิดอยู่</p>
                <p className="text-xs text-stone-500">
                  กดปุ่ม &quot;เริ่มรับเช็กชื่อ&quot; ด้านบนขวาเพื่อเปิดระบบและแสดง QR Code
                </p>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Check-in QR Code"
                className="w-64 h-64 sm:w-80 sm:h-80 object-contain rounded-xl"
              />
            ) : (
              <div className="w-64 h-64 sm:w-80 sm:h-80 flex flex-col items-center justify-center text-stone-400 space-y-3 bg-stone-100 rounded-2xl">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                <p className="text-xs font-semibold">กำลังสร้าง QR Code ขนาดยักษ์...</p>
              </div>
            )}
          </div>

          {/* คำแนะนำสำหรับนักเรียน */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-stone-400 max-w-lg">
            <div className="flex items-center gap-2 bg-stone-900/80 px-4 py-2 rounded-2xl border border-stone-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <span>เปิดกล้องมือถือสแกน QR หรือเข้าผ่านระบบ</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-900/80 px-4 py-2 rounded-2xl border border-stone-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <span>พิมพ์รหัส Key 6 หลัก หรือกดยืนยันทันที</span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Live Real-Time Feed & Counter */}
        <div className="lg:col-span-5 flex flex-col space-y-4 h-full max-h-[640px]">
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
                  const checkTime = formatThaiTime(item.checkedAt, { showSeconds: true });

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
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleMarkUncheckedAbsent}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-800/80 hover:bg-rose-950/80 hover:border-rose-800 border border-stone-700 text-stone-300 hover:text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <UserX className="w-3.5 h-3.5 text-rose-400" />
              <span>ปรับคนค้างเป็นขาด</span>
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Location Map Picker Modal */}
      <ClassroomMapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        sessionId={sessionId}
        initialCoords={centerCoords}
        onSaved={(newCoords) => setCenterCoords(newCoords)}
      />

      {/* Student Attendance Live Map Modal */}
      <StudentAttendanceMapModal
        isOpen={isStudentMapOpen}
        onClose={() => setIsStudentMapOpen(false)}
        sessionTitle={sessionTitle}
        records={
          allStudentsMapRecords.length > 0
            ? allStudentsMapRecords
            : recentCheckins.map((r) => ({
                studentId: r.studentId,
                studentCode: r.studentCode,
                studentName: r.studentName,
                className: r.className,
                studentNumber: r.studentNumber,
                status: "PRESENT",
                checkedAt: r.checkedAt,
                checkInMethod: r.checkInMethod,
                latitude: r.latitude ?? null,
                longitude: r.longitude ?? null,
                distanceFromSession: r.distanceFromSession ?? null,
                hasLocation: r.hasLocation,
              }))
        }
        centerCoords={centerCoords}
      />
    </div>
  );
}
