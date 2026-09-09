"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  MapPin,
  Search,
  Navigation,
  Check,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { updateSessionClassroomLocationAction } from "@/actions/attendance-key";
import { showCozySuccess, showCozyError } from "@/lib/ui/swal";
import { DEFAULT_MAP_CENTER, DEFAULT_ATTENDANCE_RADIUS } from "@/lib/constants/defaults";
import "leaflet/dist/leaflet.css";

interface ClassroomMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  initialCoords?: {
    latitude: number;
    longitude: number;
    expectedRadius?: number;
  } | null;
  onSaved?: (coords: { latitude: number; longitude: number; expectedRadius: number }) => void;
}

export function ClassroomMapPickerModal({
  isOpen,
  onClose,
  sessionId,
  initialCoords,
  onSaved,
}: ClassroomMapPickerModalProps) {
  const [lat, setLat] = useState<number>(initialCoords?.latitude || DEFAULT_MAP_CENTER.lat);
  const [lng, setLng] = useState<number>(initialCoords?.longitude || DEFAULT_MAP_CENTER.lng);
  const [radius, setRadius] = useState<number>(initialCoords?.expectedRadius || DEFAULT_ATTENDANCE_RADIUS);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // ซิงก์ค่าเริ่มต้น
  useEffect(() => {
    if (isOpen) {
      const initLat = initialCoords?.latitude || DEFAULT_MAP_CENTER.lat;
      const initLng = initialCoords?.longitude || DEFAULT_MAP_CENTER.lng;
      const initRad = initialCoords?.expectedRadius || DEFAULT_ATTENDANCE_RADIUS;
      setLat(initLat);
      setLng(initLng);
      setRadius(initRad);
    }
  }, [isOpen, initialCoords]);

  // สร้าง Custom Icon สำหรับหมุดห้องเรียน (Classroom Center Pin)
  const createClassroomIcon = useCallback((L: any) => {
    return L.divIcon({
      className: "custom-classroom-pin",
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #D97706;
          border: 3px solid #FFFFFF;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: #FFFFFF;
            font-size: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            🏫
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -38],
    });
  }, []);

  // สร้างและจัดการ Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      // ล้าง instance เดิมถ้ามี
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
      });

      // ใช้งาน OpenStreetMap Standard Tile Server (ฟรี 100%)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // หมุดห้องเรียน (Draggable Marker)
      const pinIcon = createClassroomIcon(L);
      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup("<b>🏫 พิกัดห้องเรียน</b><br/>สามารถลากหมุดเพื่อปรับตำแหน่งได้");

      // วงกลมแสดงรัศมีตรวจจับ
      const circle = L.circle([lat, lng], {
        radius: radius,
        color: "#D97706",
        fillColor: "#F59E0B",
        fillOpacity: 0.18,
        weight: 2,
        dashArray: "4, 6",
      }).addTo(map);

      // เมื่อลากหมุด
      marker.on("dragend", (e: any) => {
        const position = e.target.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        circle.setLatLng(position);
      });

      // เมื่อคลิกบนแผนที่
      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLng(clickLng);
        marker.setLatLng([clickLat, clickLng]);
        circle.setLatLng([clickLat, clickLng]);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // บังคับ map invalidateSize เมื่อ container เรนเดอร์เสร็จ
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
  }, [isOpen]);

  // อัปเดตรัศมีวงกลมเมื่อตัวเลขรัศมีเปลี่ยน
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  // ค้นหาสถานที่ผ่าน OpenStreetMap Nominatim API
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5&countrycodes=th`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          showCozyError("ไม่พบผลการค้นหา", "ลองพิมพ์ชื่อโรงเรียน ตำบล หรืออำเภออีกครั้ง");
        }
      }
    } catch {
      showCozyError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อระบบค้นหาสถานที่ได้ในขณะนี้");
    } finally {
      setIsSearching(false);
    }
  };

  // เลือกผลการค้นหา
  const handleSelectSearchResult = (item: { lat: string; lon: string; display_name: string }) => {
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);
    setLat(newLat);
    setLng(newLng);
    setSearchResults([]);
    setSearchQuery("");

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 17);
      markerRef.current.setLatLng([newLat, newLng]);
      circleRef.current.setLatLng([newLat, newLng]);
    }
  };

  // ดึงพิกัด GPS ของอุปกรณ์ปัจจุบัน
  const handleGetDeviceLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      showCozyError("ไม่รองรับ", "อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS");
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 18);
          markerRef.current.setLatLng([newLat, newLng]);
          circleRef.current.setLatLng([newLat, newLng]);
        }
        showCozySuccess("ดึงพิกัดปัจจุบันสำเร็จ!", "หมุดถูกเลื่อนมายังตำแหน่งของคุณเรียบร้อยแล้ว");
      },
      (err) => {
        setIsGettingGps(false);
        showCozyError("ดึงพิกัดไม่สำเร็จ", err.message || "ไม่สามารถอ่านพิกัด GPS ได้");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // บันทึกพิกัดห้องเรียน
  const handleSaveLocation = async () => {
    setIsSaving(true);
    try {
      const res = await updateSessionClassroomLocationAction(sessionId, {
        latitude: lat,
        longitude: lng,
        expectedRadius: radius,
      });

      if (res.success) {
        await showCozySuccess("บันทึกสำเร็จ!", res.message);
        if (onSaved) {
          onSaved({ latitude: lat, longitude: lng, expectedRadius: radius });
        }
        onClose();
      } else {
        await showCozyError("เกิดข้อผิดพลาด", res.message);
      }
    } catch (err: any) {
      await showCozyError("ระบบขัดข้อง", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                ตั้งค่าตำแหน่งห้องเรียนบนแผนที่ (Classroom Location)
              </h2>
              <p className="text-xs text-stone-500">
                คลิกบนแผนที่หรือลากหมุดเพื่อระบุอาคาร/ห้องเรียนที่นักเรียนต้องอยู่
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tool Bar */}
        <div className="p-4 border-b border-stone-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchLocation} className="flex-1 relative">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อโรงเรียน หรือตำบล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>ค้นหา</span>
              </button>
            </div>

            {/* Search Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden z-20 max-h-48 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3.5 py-2.5 text-xs text-stone-700 hover:bg-amber-50 hover:text-amber-900 border-b border-stone-100 last:border-none flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick GPS Button */}
          <button
            type="button"
            onClick={handleGetDeviceLocation}
            disabled={isGettingGps}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all shrink-0 active:scale-95"
          >
            {isGettingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>พิกัด GPS อุปกรณ์</span>
          </button>
        </div>

        {/* Map Canvas Container */}
        <div className="flex-1 min-h-[340px] sm:min-h-[420px] relative bg-stone-100">
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0" />

          {/* Hint Overlay */}
          <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-stone-200 shadow-md text-[11px] text-stone-600 flex items-center gap-1.5 pointer-events-none">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>คลิกที่ใดก็ได้บนแผนที่เพื่อย้ายหมุด</span>
          </div>
        </div>

        {/* Radius & Coordinates Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Radius Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs font-bold text-stone-700 shrink-0">
              รัศมีตรวจจับรอบห้องเรียน:
            </span>
            <div className="flex items-center gap-1.5">
              {[50, 100, 200, 500].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    radius === r
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {r} ม.
                </button>
              ))}
            </div>
            <span className="text-[11px] text-stone-400 font-mono">
              ({lat.toFixed(5)}, {lng.toFixed(5)})
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 transition-all"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>บันทึกตำแหน่งห้องเรียน</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
