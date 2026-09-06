import { EventEmitter } from "events";

export interface CheckInEventPayload {
  sessionId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  studentNumber: number;
  checkedAt: string;
  checkInMethod: string;
  hasLocation: boolean;
  distanceFromSession?: number | null;
  locationAccuracy?: number | null;
  status: string;
}

export interface SessionStatePayload {
  sessionId: string;
  isKeyActive: boolean;
}

export interface SessionBatchUpdatePayload {
  sessionId: string;
  action: "RESET_ALL_ABSENT" | "MARK_ALL_PRESENT" | "BATCH_ABSENT" | "SAVED";
}

// Global Singleton EventEmitter สำหรับ Next.js Dev & Prod
declare global {
  // eslint-disable-next-line no-var
  var __attendanceEventEmitter: EventEmitter | undefined;
}

export const attendanceEventBus: EventEmitter =
  global.__attendanceEventEmitter || new EventEmitter();

// ปรับ max listeners ป้องกัน warning เมื่อมีหลายหน้าต่างเปิดพร้อมกัน
attendanceEventBus.setMaxListeners(200);

// บันทึกใส่ global เสมอทั้งใน dev และ prod เพื่อรักษา singleton instance ข้าม chunks/modules
global.__attendanceEventEmitter = attendanceEventBus;
