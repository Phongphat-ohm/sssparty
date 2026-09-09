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
 * แปลงค่า Input หลากหลายรูปแบบ (string, number, Date) เป็น Date Object อย่างปลอดภัย
 */
export function toSafeDate(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  const date = input instanceof Date ? input : new Date(input);
  return isNaN(date.getTime()) ? null : date;
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
