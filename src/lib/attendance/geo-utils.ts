/**
 * คำนวณระยะทางระหว่างจุด 2 จุดบนผิวโลก (สูตร Haversine)
 * ส่งคืนผลลัพธ์เป็นเมตร (Meters)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // รัศมีโลกเฉลี่ย (เมตร)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * รูปแบบข้อความแสดงระยะทาง เช่น "25 ม." หรือ "2.4 กม."
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return "ไม่ระบุ";
  if (meters < 1000) {
    return `${meters} เมตร`;
  }
  return `${(meters / 1000).toFixed(1)} กิโลเมตร`;
}

/**
 * ประเมินสถานะพิกัดของนักเรียน
 */
export function evaluateLocationStatus(params: {
  hasLocation: boolean;
  distanceFromSession?: number | null;
  accuracy?: number | null;
  expectedRadius?: number | null;
}): {
  status: "NORMAL" | "WARNING_LOW_ACCURACY" | "SUSPICIOUS_FAR" | "NO_LOCATION";
  label: string;
  badgeColor: string;
} {
  const { hasLocation, distanceFromSession, accuracy, expectedRadius = 100 } = params;

  if (!hasLocation || distanceFromSession === null || distanceFromSession === undefined) {
    return {
      status: "NO_LOCATION",
      label: "ไม่ได้ระบุพิกัด",
      badgeColor: "bg-stone-100 text-stone-600 border-stone-200",
    };
  }

  // กรณีสัญญาณ GPS คลาดเคลื่อนสูงมาก (> 150 เมตร)
  if (accuracy && accuracy > 150) {
    return {
      status: "WARNING_LOW_ACCURACY",
      label: `สัญญาณคลาดเคลื่อน (±${Math.round(accuracy)}ม.)`,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  // กรณีอยู่นอกรัศมีที่กำหนด
  const threshold = expectedRadius || 100;
  if (distanceFromSession > threshold) {
    return {
      status: "SUSPICIOUS_FAR",
      label: `อยู่นอกพื้นที่ (${formatDistance(distanceFromSession)})`,
      badgeColor: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    status: "NORMAL",
    label: `ในพื้นที่ (${formatDistance(distanceFromSession)})`,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
}
