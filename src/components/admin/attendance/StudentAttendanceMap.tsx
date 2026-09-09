"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Navigation,
  Maximize2,
  Filter,
} from "lucide-react";
import { formatDistance } from "@/lib/attendance/geo-utils";
import { formatThaiTime } from "@/lib/utils/date-thai";
import "leaflet/dist/leaflet.css";

export interface StudentMapRecord {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  studentNumber: number;
  status: string;
  checkedAt?: string | null;
  checkInMethod?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  distanceFromSession?: number | null;
  hasLocation: boolean;
}

interface StudentAttendanceMapProps {
  records: StudentMapRecord[];
  centerCoords?: {
    latitude: number;
    longitude: number;
    expectedRadius?: number;
  } | null;
  height?: string;
  selectedStudentId?: string | null;
}

export function StudentAttendanceMap({
  records,
  centerCoords,
  height = "520px",
  selectedStudentId = null,
}: StudentAttendanceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const studentMarkersMapRef = useRef<Map<string, any>>(new Map());

  const [filterMode, setFilterMode] = useState<"ALL" | "IN_ZONE" | "OUT_ZONE">("ALL");

  const expectedRadius = centerCoords?.expectedRadius || 100;

  // กรองเฉพาะนักเรียนที่มีพิกัดจริง
  const recordsWithCoords = records.filter(
    (r) => r.hasLocation && r.latitude !== null && r.longitude !== null
  );

  const inZoneRecords = recordsWithCoords.filter(
    (r) => r.distanceFromSession !== null && r.distanceFromSession !== undefined && r.distanceFromSession <= expectedRadius
  );

  const outZoneRecords = recordsWithCoords.filter(
    (r) => r.distanceFromSession !== null && r.distanceFromSession !== undefined && r.distanceFromSession > expectedRadius
  );

  // สร้าง Custom Icon หมุดนักเรียน (เขียว/แดง)
  const createStudentIcon = useCallback((L: any, isInZone: boolean, studentNumber: number) => {
    const bgColor = isInZone ? "#10B981" : "#EF4444"; // emerald-500 or red-500
    const borderColor = "#FFFFFF";

    return L.divIcon({
      className: "custom-student-pin",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          background: ${bgColor};
          border: 2.5px solid ${borderColor};
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <span style="
            transform: rotate(45deg);
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            font-family: monospace;
          ">
            ${studentNumber}
          </span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }, []);

  // สร้าง Custom Icon หมุดห้องเรียน
  const createClassroomIcon = useCallback((L: any) => {
    return L.divIcon({
      className: "custom-classroom-center-pin",
      html: `
        <div style="
          width: 42px;
          height: 42px;
          background: #D97706;
          border: 3.5px solid #FFFFFF;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 18px;
          ">
            🏫
          </span>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 42],
      popupAnchor: [0, -42],
    });
  }, []);

  // สร้างและจัดการแผนที่
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // ล้าง instance เก่า
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const defaultCenterLat = centerCoords?.latitude || (recordsWithCoords[0]?.latitude ?? 13.7563);
      const defaultCenterLng = centerCoords?.longitude || (recordsWithCoords[0]?.longitude ?? 100.5018);

      const map = L.map(mapContainerRef.current, {
        center: [defaultCenterLat, defaultCenterLng],
        zoom: 17,
        zoomControl: true,
      });

      // ใช้งาน OpenStreetMap Standard Tiles ฟรี 100%
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // สร้าง LayerGroup สำหรับหมุดนักเรียน
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // ปรับปรุงหมุด
      renderMarkers(L);

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ฟังก์ชันวาดหมุดห้องเรียนและนักเรียนลงบนแผนที่
  const renderMarkers = useCallback(
    async (L: any) => {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;

      const map = mapInstanceRef.current;
      const layer = markersLayerRef.current;
      layer.clearLayers();
      studentMarkersMapRef.current.clear();

      const allLatLngs: [number, number][] = [];

      // 1. ปักหมุดห้องเรียน + รัศมี (ถ้ามี)
      if (centerCoords && centerCoords.latitude && centerCoords.longitude) {
        const classroomPos: [number, number] = [centerCoords.latitude, centerCoords.longitude];
        allLatLngs.push(classroomPos);

        const classroomMarker = L.marker(classroomPos, {
          icon: createClassroomIcon(L),
          zIndexOffset: 1000,
        }).addTo(layer);

        classroomMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
            <strong style="color: #D97706; font-size: 14px;">🏫 จุดอ้างอิงห้องเรียน</strong><br/>
            <span>รัศมีอนุญาต: <b>${expectedRadius} เมตร</b></span><br/>
            <span style="font-size: 11px; color: #78716C;">(${centerCoords.latitude.toFixed(5)}, ${centerCoords.longitude.toFixed(5)})</span>
          </div>
        `);

        L.circle(classroomPos, {
          radius: expectedRadius,
          color: "#D97706",
          fillColor: "#F59E0B",
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "4, 6",
        }).addTo(layer);
      }

      // 2. ปักหมุดนักเรียนตามฟิลเตอร์
      let targetRecords = recordsWithCoords;
      if (filterMode === "IN_ZONE") targetRecords = inZoneRecords;
      if (filterMode === "OUT_ZONE") targetRecords = outZoneRecords;

      targetRecords.forEach((student) => {
        if (typeof student.latitude !== "number" || typeof student.longitude !== "number") return;

        const studentPos: [number, number] = [student.latitude, student.longitude];
        allLatLngs.push(studentPos);

        const isInZone =
          student.distanceFromSession !== null &&
          student.distanceFromSession !== undefined &&
          student.distanceFromSession <= expectedRadius;

        const icon = createStudentIcon(L, isInZone, student.studentNumber);

        const marker = L.marker(studentPos, { icon }).addTo(layer);
        studentMarkersMapRef.current.set(student.studentId, marker);

        const timeStr = formatThaiTime(student.checkedAt, { showSeconds: true, fallback: "-" });

        const distStr = formatDistance(student.distanceFromSession);
        const statusBadge = isInZone
          ? '<span style="color: #059669; background: #ECFDF5; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">🟢 อยู่ในห้องเรียน</span>'
          : '<span style="color: #DC2626; background: #FEF2F2; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px;">🔴 นอกพื้นที่ห้องเรียน</span>';

        const methodStr = student.checkInMethod === "DYNAMIC_QR" ? "สแกน QR Code" : "รหัส Key 6 หลัก";

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.5; min-width: 180px;">
            <div style="margin-bottom: 6px;">
              ${statusBadge}
            </div>
            <strong style="font-size: 14px; color: #1C1917; display: block;">${student.studentName}</strong>
            <span style="color: #57534E; font-size: 12px;">ชั้น ${student.className} เลขที่ ${student.studentNumber} (${student.studentCode})</span>
            <hr style="border: 0; border-top: 1px solid #E7E5E4; margin: 6px 0;" />
            <div><b>ระยะห่าง:</b> <span style="font-weight: bold; color: ${isInZone ? "#059669" : "#DC2626"};">${distStr}</span></div>
            <div><b>เวลาที่เช็กชื่อ:</b> ${timeStr}</div>
            <div><b>วิธีเช็ก:</b> ${methodStr}</div>
            ${
              student.locationAccuracy
                ? `<div style="color: #78716C; font-size: 11px;">ความแม่นยำ GPS: ±${Math.round(student.locationAccuracy)} ม.</div>`
                : ""
            }
          </div>
        `;

        marker.bindPopup(popupContent);
      });

      // Fit bounds ให้ครอบคลุมทุกหมุด
      if (allLatLngs.length > 0) {
        map.fitBounds(allLatLngs, { padding: [40, 40], maxZoom: 18 });
      }
    },
    [centerCoords, recordsWithCoords, filterMode, expectedRadius, createClassroomIcon, createStudentIcon]
  );

  // อัปเดตหมุดเมื่อข้อมูลหรือฟิลเตอร์เปลี่ยน
  useEffect(() => {
    const update = async () => {
      const L = (await import("leaflet")).default;
      renderMarkers(L);
    };
    update();
  }, [renderMarkers]);

  // ซูมหาตำแหน่งนักเรียนรายบุคคลเมื่อคลิกจากภายนอก
  useEffect(() => {
    if (!selectedStudentId || !mapInstanceRef.current) return;
    const marker = studentMarkersMapRef.current.get(selectedStudentId);
    if (marker) {
      const pos = marker.getLatLng();
      mapInstanceRef.current.setView(pos, 18, { animate: true });
      marker.openPopup();
    }
  }, [selectedStudentId]);

  // ปุ่มรีเซ็ตมุมมองให้พอดีกับทุกคน
  const handleResetBounds = async () => {
    if (!mapInstanceRef.current) return;
    const allLatLngs: [number, number][] = [];
    if (centerCoords && centerCoords.latitude && centerCoords.longitude) {
      allLatLngs.push([centerCoords.latitude, centerCoords.longitude]);
    }
    recordsWithCoords.forEach((r) => {
      if (typeof r.latitude === "number" && typeof r.longitude === "number") {
        allLatLngs.push([r.latitude, r.longitude]);
      }
    });

    if (allLatLngs.length > 0) {
      mapInstanceRef.current.fitBounds(allLatLngs, { padding: [40, 40], maxZoom: 18 });
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
      {/* Top Map Toolbar */}
      <div className="px-4 py-3 border-b border-stone-200 bg-stone-50/90 flex flex-wrap items-center justify-between gap-3">
        {/* Statistics Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700">
            <Users className="w-3.5 h-3.5 text-stone-500" />
            <span>มีพิกัดทั้งหมด: <b>{recordsWithCoords.length}</b> คน</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>ในห้องเรียน: {inZoneRecords.length} คน</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>นอกพื้นที่: {outZoneRecords.length} คน</span>
          </div>
        </div>

        {/* Filter Toggle Buttons & Fit Button */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex bg-stone-200/80 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterMode("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === "ALL" ? "bg-white text-stone-800 shadow-2xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("IN_ZONE")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === "IN_ZONE" ? "bg-emerald-600 text-white shadow-2xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              ในห้อง
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("OUT_ZONE")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === "OUT_ZONE" ? "bg-red-600 text-white shadow-2xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              นอกพื้นที่
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetBounds}
            title="ปรับมุมมองแผนที่ให้เห็นครบทุกคน"
            className="p-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="w-full relative bg-stone-100" style={{ height }}>
        <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

        {/* No Location Notice overlay if no coords */}
        {recordsWithCoords.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-900/40 backdrop-blur-2xs text-white p-4 text-center">
            <MapPin className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <p className="font-bold text-sm">ยังไม่มีข้อมูลพิกัดของนักเรียนในรอบนี้</p>
            <p className="text-xs text-stone-300 mt-1 max-w-sm">
              เมื่อนักเรียนกดเช็กชื่อและเปิดแชร์ตำแหน่ง หมุดสีเขียว/แดงของนักเรียนจะปรากฏบนแผนที่นี้โดยอัตโนมัติ
            </p>
          </div>
        )}

        {/* Legend Overlay at bottom-left */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-xs px-3 py-2 rounded-2xl border border-stone-200 shadow-md text-[11px] text-stone-700 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold">
            <span>🏫</span>
            <span>จุดตั้งห้องเรียน (รัศมี {expectedRadius} ม.)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>ในห้องเรียน (&le; {expectedRadius} ม.)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
            <span>นอกพื้นที่ (&gt; {expectedRadius} ม.)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
