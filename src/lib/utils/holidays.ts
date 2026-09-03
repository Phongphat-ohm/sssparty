import Holidays from "date-holidays";

const hd = new Holidays("TH", { languages: ["th"] });

export interface ThaiHolidayInfo {
  date: string; // YYYY-MM-DD
  name: string;
  type: string;
}

/**
 * ดึงรายการวันหยุดราชการและวันสำคัญของประเทศไทยสำหรับปีที่ระบุ (พ.ศ. หรือ ค.ศ.)
 * คืนค่าเป็น Record<string, ThaiHolidayInfo> โดยมี key เป็น YYYY-MM-DD
 */
export function getThaiHolidaysMap(year: number): Record<string, ThaiHolidayInfo> {
  // รับประกันว่าเป็นปี ค.ศ.
  const ceYear = year > 2400 ? year - 543 : year;
  const holidays = hd.getHolidays(ceYear);
  const holidayMap: Record<string, ThaiHolidayInfo> = {};

  if (!holidays || !Array.isArray(holidays)) {
    return holidayMap;
  }

  for (const h of holidays) {
    const dateKey = h.date.split(" ")[0];
    holidayMap[dateKey] = {
      date: dateKey,
      name: h.name,
      type: h.type,
    };
  }

  return holidayMap;
}

/**
 * ตรวจสอบว่าวันที่ระบุเป็นวันหยุดหรือไม่
 */
export function checkThaiHoliday(date: Date | string): ThaiHolidayInfo | null {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const result = hd.isHoliday(dateObj);
  if (!result) return null;

  const holidayItem = Array.isArray(result) ? result[0] : result;
  const dateKey = holidayItem.date.split(" ")[0];

  return {
    date: dateKey,
    name: holidayItem.name,
    type: holidayItem.type,
  };
}
