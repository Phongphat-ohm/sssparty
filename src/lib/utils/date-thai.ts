/**
 * Standard Thai DateTime Formatter Utilities
 * รองรับการจัดรูปแบบวันเวลาภาษาไทย ปี พ.ศ. (พุทธศักราช) และระบบเวลา 24 ชั่วโมง
 * โซนเวลามาตรฐานประเทศไทย (Asia/Bangkok, UTC+7)
 */

export const THAI_TIMEZONE = "Asia/Bangkok";
export const THAI_LOCALE = "th-TH-u-ca-buddhist";

export interface DateFormatOptions {
  fallback?: string;
  timeZone?: string;
}

export interface ThaiDateOptions extends DateFormatOptions {
  variant?: "short" | "long" | "withWeekday" | "numeric";
}

export interface ThaiTimeOptions extends DateFormatOptions {
  showSeconds?: boolean;
  showUnit?: boolean; // แสดง " น." หรือไม่ (ค่าเริ่มต้น: true)
}

export interface ThaiDateTimeOptions extends DateFormatOptions {
  variant?: "short" | "long" | "withSeconds";
  showUnit?: boolean; // แสดง " น." หรือไม่ (ค่าเริ่มต้น: true)
}

/**
 * ดึงส่วนประกอบของวันและเวลา (ปี ค.ศ., เดือน 0-11, วันที่, ชั่วโมง, นาที, วินาที)
 * ตามโซนเวลามาตรฐานประเทศไทย (Asia/Bangkok, UTC+7) เสมอ
 */
export function getThaiDateParts(input: string | number | Date | null | undefined): {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  day: number;
  hour: number;
  minute: number;
  second: number;
  buddhistYear: number;
} {
  const d = toSafeDate(input) || new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: THAI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  const year = getPart("year");
  const month = getPart("month") - 1; // 1-12 -> 0-11
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    buddhistYear: year + 543,
  };
}

/**
 * หาวันที่ปัจจุบันในรูปแบบ "YYYY-MM-DD" ตามโซนเวลาประเทศไทย (Asia/Bangkok)
 * ป้องกันปัญหา .toISOString().split("T")[0] ที่ได้วันของเมื่อวานในช่วง 00:00 - 06:59 น.
 */
export function getThaiTodayDateString(): string {
  const { year, month, day } = getThaiDateParts(new Date());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * แปลง Date หรือ ISO String ใดๆ ให้ออกมาเป็น "YYYY-MM-DDTHH:mm" ตามเวลาไทย (Asia/Bangkok)
 * เหมาะสำหรับใช้เป็นค่าตั้งต้น (value) ให้กับ input datetime-local หรือ ThaiDateTimePicker
 */
export function formatThaiDateTimeLocalISO(input: string | number | Date | null | undefined): string {
  if (!input) return "";
  const d = toSafeDate(input);
  if (!d) return "";
  const { year, month, day, hour, minute } = getThaiDateParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/**
 * แปลง String หรือ Date ใดๆ ให้เป็น Date Object โดยตีความตามโซนเวลาประเทศไทย (Asia/Bangkok, UTC+7) เสมอ
 * - หากรับ "YYYY-MM-DDTHH:mm" หรือ "YYYY-MM-DD HH:mm" ที่ไม่มี Offset จะต่อท้าย "+07:00" ทันที
 * - หากรับ "YYYY-MM-DD" จะถือเป็น "YYYY-MM-DDT00:00:00+07:00"
 * - หากรับ ISO String ที่มี Offset แล้ว (Z หรือ +07:00) จะ parse ได้เวลา UTC ตามจริง
 */
export function parseThaiDateTime(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // Case 1: Date only "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T00:00:00+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Case 2: DateTime without timezone offset "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    const standardized = str.replace(" ", "T");
    const withSeconds = standardized.split(":").length === 2 ? `${standardized}:00` : standardized;
    const d = new Date(`${withSeconds}+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Case 3: DateTime already with timezone (Z, +XX:XX, -XX:XX) or standard format
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * แปลงค่า Input หลากหลายรูปแบบ (string, number, Date) เป็น Date Object อย่างปลอดภัย
 * ตีความตามเขตเวลาประเทศไทย (Asia/Bangkok, UTC+7) เสมอ
 */
export function toSafeDate(input: string | number | Date | null | undefined): Date | null {
  return parseThaiDateTime(input);
}

/**
 * ดึงปี พ.ศ. จาก Date
 */
export function getThaiBuddhistYear(
  input: string | number | Date | null | undefined,
  timeZone: string = THAI_TIMEZONE
): number | null {
  const d = toSafeDate(input);
  if (!d) return null;

  try {
    const formatter = new Intl.DateTimeFormat(THAI_LOCALE, {
      year: "numeric",
      timeZone,
    });
    const formattedYear = parseInt(formatter.format(d).replace(/\D/g, ""), 10);
    if (!isNaN(formattedYear) && formattedYear > 2400) {
      return formattedYear;
    }
    // Fallback: ถ้าเอนจินไม่แปลงปี พ.ศ. ให้ บวก 543 ตรงๆ
    return d.getFullYear() + 543;
  } catch {
    return d.getFullYear() + 543;
  }
}

/**
 * จัดรูปแบบวันที่ภาษาไทย ปี พ.ศ.
 * - 'short': 9 ก.ย. 2569 (ค่าเริ่มต้น)
 * - 'long': 9 กันยายน 2569
 * - 'withWeekday': วันพุธที่ 9 กันยายน 2569
 * - 'numeric': 09/09/2569
 */
export function formatThaiDate(
  input: string | number | Date | null | undefined,
  options?: ThaiDateOptions
): string {
  const fallback = options?.fallback ?? "-";
  const d = toSafeDate(input);
  if (!d) return fallback;

  const timeZone = options?.timeZone ?? THAI_TIMEZONE;
  const variant = options?.variant ?? "short";

  try {
    if (variant === "numeric") {
      const parts = new Intl.DateTimeFormat(THAI_LOCALE, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone,
      }).formatToParts(d);

      const day = parts.find((p) => p.type === "day")?.value || "";
      const month = parts.find((p) => p.type === "month")?.value || "";
      let year = parts.find((p) => p.type === "year")?.value || "";
      if (parseInt(year, 10) < 2400) {
        year = String(parseInt(year, 10) + 543);
      }
      return `${day}/${month}/${year}`;
    }

    if (variant === "withWeekday") {
      return new Intl.DateTimeFormat(THAI_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone,
      }).format(d);
    }

    if (variant === "long") {
      return new Intl.DateTimeFormat(THAI_LOCALE, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone,
      }).format(d);
    }

    // Default 'short'
    return new Intl.DateTimeFormat(THAI_LOCALE, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    }).format(d);
  } catch (err) {
    console.warn("[date-thai] formatThaiDate error:", err);
    return fallback;
  }
}

/**
 * จัดรูปแบบเวลาภาษาไทย 24 ชั่วโมง
 * - 19:30 น. (showSeconds = false, showUnit = true)
 * - 19:30:45 น. (showSeconds = true, showUnit = true)
 * - 19:30 (showUnit = false)
 */
export function formatThaiTime(
  input: string | number | Date | null | undefined,
  options?: ThaiTimeOptions
): string {
  const fallback = options?.fallback ?? "-";
  const d = toSafeDate(input);
  if (!d) return fallback;

  const timeZone = options?.timeZone ?? THAI_TIMEZONE;
  const showSeconds = options?.showSeconds ?? false;
  const showUnit = options?.showUnit ?? true;

  try {
    const timeStr = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: showSeconds ? "2-digit" : undefined,
      hour12: false,
      hourCycle: "h23",
      timeZone,
    }).format(d);

    return showUnit ? `${timeStr} น.` : timeStr;
  } catch (err) {
    console.warn("[date-thai] formatThaiTime error:", err);
    return fallback;
  }
}

/**
 * จัดรูปแบบวันและเวลาภาษาไทยพร้อมกัน (ปี พ.ศ. + 24 ชั่วโมง)
 * - 'short': 9 ก.ย. 2569 19:30 น. (ค่าเริ่มต้น)
 * - 'long': 9 กันยายน 2569 เวลา 19:30 น.
 * - 'withSeconds': 9 ก.ย. 2569 19:30:45 น.
 */
export function formatThaiDateTime(
  input: string | number | Date | null | undefined,
  options?: ThaiDateTimeOptions
): string {
  const fallback = options?.fallback ?? "-";
  const d = toSafeDate(input);
  if (!d) return fallback;

  const timeZone = options?.timeZone ?? THAI_TIMEZONE;
  const variant = options?.variant ?? "short";
  const showUnit = options?.showUnit ?? true;

  try {
    const isLong = variant === "long";
    const withSec = variant === "withSeconds";

    const dateStr = new Intl.DateTimeFormat(THAI_LOCALE, {
      day: "numeric",
      month: isLong ? "long" : "short",
      year: "numeric",
      timeZone,
    }).format(d);

    const timeStr = new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: withSec ? "2-digit" : undefined,
      hour12: false,
      hourCycle: "h23",
      timeZone,
    }).format(d);

    const unitStr = showUnit ? " น." : "";

    if (isLong) {
      return `${dateStr} เวลา ${timeStr}${unitStr}`;
    }

    return `${dateStr} ${timeStr}${unitStr}`;
  } catch (err) {
    console.warn("[date-thai] formatThaiDateTime error:", err);
    return fallback;
  }
}
