/**
 * ฟังก์ชันช่วยตรวจสอบว่าเวลาที่เช็กชื่อ เกินเวลาที่กำหนด (Cutoff Time) หรือไม่
 * คำนวณตามเขตเวลาประเทศไทย (Asia/Bangkok)
 *
 * @param checkedAt วันเวลาที่เช็กชื่อ
 * @param cutoffTimeStr เวลาที่กำหนดในรูปแบบ "HH:mm" เช่น "08:30"
 * @returns boolean: true ถ้าเกินเวลา (มาสาย), false ถ้าทันเวลา (มาเรียน)
 */
export function isTimePastCutoff(checkedAt: Date, cutoffTimeStr: string): boolean {
  if (!cutoffTimeStr || !cutoffTimeStr.includes(":")) {
    return false;
  }

  try {
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = timeFormatter.format(checkedAt).split(":");
    const currentH = parseInt(parts[0], 10);
    const currentM = parseInt(parts[1], 10);

    const [cutoffHStr, cutoffMStr] = cutoffTimeStr.trim().split(":");
    const cutoffH = parseInt(cutoffHStr, 10);
    const cutoffM = parseInt(cutoffMStr, 10);

    if (isNaN(currentH) || isNaN(currentM) || isNaN(cutoffH) || isNaN(cutoffM)) {
      return false;
    }

    const currentTotalMinutes = currentH * 60 + currentM;
    const cutoffTotalMinutes = cutoffH * 60 + cutoffM;

    return currentTotalMinutes > cutoffTotalMinutes;
  } catch (err) {
    console.error("isTimePastCutoff error:", err);
    return false;
  }
}

import { formatThaiTime } from "@/lib/utils/date-thai";
export { formatThaiTime };
