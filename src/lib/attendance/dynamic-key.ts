import crypto from "crypto";

export const KEY_ROTATION_INTERVAL_SECONDS = 30;

/**
 * สุ่มสร้าง Secret Key ประจำรอบเช็กชื่อ (Hex string 32 ตัวอักษร)
 */
export function generateSessionSecret(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * คำนวณ Time Step ปัจจุบัน (ทุกๆ 30 วินาที)
 */
export function getTimeStep(timestamp = Date.now()): number {
  return Math.floor(timestamp / (KEY_ROTATION_INTERVAL_SECONDS * 1000));
}

/**
 * คำนวณจำนวนวินาทีที่เหลือก่อนรหัสจะเปลี่ยน (1-30 วินาที)
 */
export function getRemainingSeconds(timestamp = Date.now()): number {
  const currentSeconds = Math.floor(timestamp / 1000);
  const elapsedInCycle = currentSeconds % KEY_ROTATION_INTERVAL_SECONDS;
  return KEY_ROTATION_INTERVAL_SECONDS - elapsedInCycle;
}

/**
 * สร้างรหัส Dynamic Key 6 หลักจาก Secret และ Time Step
 */
export function generateKeyForStep(secret: string, step: number): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(step.toString());
  const digest = hmac.digest();
  
  // อ่าน 4 bytes แรกเป็น unsigned 32-bit int แล้ว modulo 1,000,000
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * สร้างรหัส Dynamic Key 6 หลัก พร้อมเวลาที่เหลือ
 */
export function generateDynamicKey(
  secret: string,
  timestamp = Date.now()
): { key: string; remainingSeconds: number; currentStep: number } {
  const step = getTimeStep(timestamp);
  const key = generateKeyForStep(secret, step);
  const remainingSeconds = getRemainingSeconds(timestamp);
  return { key, remainingSeconds, currentStep: step };
}

/**
 * ตรวจสอบความถูกต้องของรหัส Key ที่นักเรียนกรอก
 * รองรับ Grace Period: ตรวจสอบทั้งรอบเวลาปัจจุบัน (T0) และรอบก่อนหน้า (T-1)
 * เพื่อป้องกันกรณีนักเรียนกดส่งวินาทีที่ 29 แล้วอินเทอร์เน็ตหน่วง
 */
export function verifyDynamicKey(
  secret: string,
  inputKey: string,
  timestamp = Date.now()
): { valid: boolean; isPreviousStep?: boolean } {
  const cleanInput = inputKey.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanInput)) {
    return { valid: false };
  }

  const currentStep = getTimeStep(timestamp);
  
  // 1. ตรวจสอบรอบปัจจุบัน (T0)
  const currentKey = generateKeyForStep(secret, currentStep);
  if (cleanInput === currentKey) {
    return { valid: true, isPreviousStep: false };
  }

  // 2. ตรวจสอบรอบก่อนหน้า (T-1, Grace Window 30 วินาทีสำหรับเน็ตช้าหรือเพิ่งเปลี่ยนรอบ)
  const previousKey = generateKeyForStep(secret, currentStep - 1);
  if (cleanInput === previousKey) {
    return { valid: true, isPreviousStep: true };
  }

  // 3. ตรวจสอบรอบถัดไป (T+1, Grace Window สำหรับกรณีนาฬิกาเครื่องนักเรียนเร็วกว่าเซิร์ฟเวอร์เล็กน้อย)
  const nextKey = generateKeyForStep(secret, currentStep + 1);
  if (cleanInput === nextKey) {
    return { valid: true, isPreviousStep: false };
  }

  return { valid: false };
}
