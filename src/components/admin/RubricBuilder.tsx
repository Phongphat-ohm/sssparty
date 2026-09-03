"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  GripVertical,
  HelpCircle,
} from "lucide-react";

export interface RubricItem {
  id?: string;
  name: string;
  description?: string;
  maxScore: number;
  sortOrder?: number;
}

interface RubricBuilderProps {
  rubrics: RubricItem[];
  onChange: (rubrics: RubricItem[]) => void;
  assignmentMaxScore: number;
  isLocked?: boolean;
}

const RUBRIC_PRESETS = [
  {
    label: "ชิ้นงานภาพกราฟิก / แบนเนอร์ (20 คะแนน)",
    targetScore: 20,
    items: [
      { name: "ความคิดสร้างสรรค์และการสื่อความหมาย", description: "แนวคิดแปลกใหม่ น่าสนใจ สื่อสารถึงประเด็นสำคัญชัดเจน", maxScore: 8 },
      { name: "ความถูกต้องขององค์ประกอบศิลป์และการจัดวาง", description: "Layout, Typography, และ Hierarchy มีความสมดุล อ่านง่าย", maxScore: 5 },
      { name: "ความคมชัดและการเลือกใช้ชุดสี", description: "ความละเอียดสูง คู่สีสวยงามและเข้ากับธีมงาน", maxScore: 4 },
      { name: "การส่งงานตรงต่อเวลาและระเบียบของไฟล์", description: "ไฟล์ถูกต้องตามที่กำหนด ส่งภายในเวลา", maxScore: 3 },
    ],
  },
  {
    label: "คลิปวิดีโอสั้น / สื่อมัลติมีเดีย (30 คะแนน)",
    targetScore: 30,
    items: [
      { name: "โครงเรื่องและการเล่าเรื่อง (Storyboard & Pacing)", description: "ลำดับภาพน่าติดตาม มีจุดเริ่มและจุดสรุปที่กระชับ", maxScore: 15 },
      { name: "เทคนิคการตัดต่อและการเลือกใช้ดนตรี/เสียง", description: "รอยต่อลื่นไหล เสียงบรรยายและดนตรีชัดเจนลงตัว", maxScore: 10 },
      { name: "คุณภาพของภาพและความละเอียดของสื่อ", description: "ความคมชัดระดับ HD/4K แสงและมุมกล้องเหมาะสม", maxScore: 5 },
    ],
  },
  {
    label: "งานสร้างสรรค์ทั่วไป (10 คะแนน)",
    targetScore: 10,
    items: [
      { name: "ความสมบูรณ์และถูกต้องของเนื้อหา", description: "ครบถ้วนตามโจทย์ที่ได้รับมอบหมาย", maxScore: 5 },
      { name: "ความคิดสร้างสรรค์และสุนทรียภาพ", description: "มีความแปลกใหม่และสวยงามน่าสนใจ", maxScore: 3 },
      { name: "ความเรียบร้อยและการส่งงาน", description: "ส่งตรงเวลาและรูปแบบไฟล์ถูกต้อง", maxScore: 2 },
    ],
  },
];

export function RubricBuilder({
  rubrics,
  onChange,
  assignmentMaxScore,
  isLocked = false,
}: RubricBuilderProps) {
  const currentSum = rubrics.reduce((acc, r) => acc + (Number(r.maxScore) || 0), 0);
  const scoreDiff = assignmentMaxScore - currentSum;
  const isMatch = Math.abs(scoreDiff) < 0.001 && assignmentMaxScore > 0;

  const handleItemChange = (index: number, field: keyof RubricItem, value: string | number) => {
    if (isLocked) return;
    const updated = [...rubrics];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleAddRubric = () => {
    if (isLocked) return;
    const defaultScore = scoreDiff > 0 ? scoreDiff : 5;
    onChange([
      ...rubrics,
      {
        name: "",
        description: "",
        maxScore: defaultScore,
        sortOrder: rubrics.length + 1,
      },
    ]);
  };

  const handleRemoveRubric = (index: number) => {
    if (isLocked || rubrics.length <= 1) return;
    const updated = rubrics.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleApplyPreset = (preset: typeof RUBRIC_PRESETS[0]) => {
    if (isLocked) return;
    onChange(
      preset.items.map((item, idx) => ({
        ...item,
        sortOrder: idx + 1,
      }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Immutability Warning */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#3F342B] text-base flex items-center gap-2">
            <span>เกณฑ์การให้คะแนน (Dynamic Rubric Builder)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF0E1] text-[#8C5D23] border border-[#EADBCC]">
              {rubrics.length} เกณฑ์
            </span>
          </h3>
          <p className="text-xs text-[#7A6A5C] mt-0.5">
            กำหนดเกณฑ์การประเมินที่ชัดเจนและคำนวณผลรวมคะแนนแบบเรียลไทม์
          </p>
        </div>

        {/* Real-time Sum Check Indicator */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
            isMatch
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : scoreDiff > 0
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {isMatch ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            ผลรวมเกณฑ์: {currentSum} / {assignmentMaxScore || 0} คะแนน
          </span>
          {isMatch ? (
            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-md">
              ตรงกันพอดี
            </span>
          ) : scoreDiff > 0 ? (
            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md">
              (ขาดอีก {scoreDiff} คะแนน)
            </span>
          ) : (
            <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.2 rounded-md">
              (เกินมา {Math.abs(scoreDiff)} คะแนน)
            </span>
          )}
        </div>
      </div>

      {/* Lock Notice */}
      {isLocked && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">เกณฑ์ Rubric ถูกล็อก (Immutability Locked)</p>
            <p className="text-amber-800 text-[11px] mt-0.5">
              มีการส่งงานจากนักเรียนแล้ว ระบบไม่อนุญาตให้แก้ไขหรือลบเกณฑ์การให้คะแนน เพื่อรักษาความถูกต้องของประวัติคะแนน
            </p>
          </div>
        </div>
      )}

      {/* Quick Presets Bar (only shown when not locked) */}
      {!isLocked && (
        <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC] space-y-2">
          <p className="text-xs font-semibold text-[#5A4D41] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
            เลือกใช้เกณฑ์แม่แบบสำเร็จรูป (Presets):
          </p>
          <div className="flex flex-wrap gap-2">
            {RUBRIC_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-xs px-3 py-1.5 rounded-xl bg-white border border-[#D9CABB] text-[#3F342B] hover:border-[#D9A441] hover:text-[#D9A441] active:scale-95 transition-all font-medium cursor-pointer shadow-2xs"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rubric Items List */}
      <div className="space-y-3">
        {rubrics.map((item, index) => (
          <div
            key={index}
            className="p-4 bg-white rounded-2xl border border-[#EADBCC] shadow-2xs space-y-3 relative group"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#8C5D23] bg-[#FAF0E1] px-2.5 py-0.5 rounded-lg">
                เกณฑ์ที่ {index + 1}
              </span>

              {!isLocked && rubrics.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRubric(index)}
                  className="p-1.5 rounded-lg text-[#B94E48] hover:bg-red-50 transition-colors cursor-pointer"
                  title="ลบเกณฑ์นี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Rubric Name */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-[#5A4D41]">
                  ชื่อเกณฑ์การให้คะแนน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  value={item.name}
                  onChange={(e) => handleItemChange(index, "name", e.target.value)}
                  placeholder="เช่น ความคิดสร้างสรรค์และการสื่อความหมาย"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 transition-all"
                />
              </div>

              {/* Rubric Max Score */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5A4D41]">
                  คะแนนเต็ม <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  disabled={isLocked}
                  value={item.maxScore || ""}
                  onChange={(e) =>
                    handleItemChange(index, "maxScore", parseFloat(e.target.value) || 0)
                  }
                  placeholder="เช่น 5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs font-bold text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 transition-all"
                />
              </div>
            </div>

            {/* Rubric Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#7A6A5C]">
                คำอธิบายรายละเอียดเกณฑ์ (ตัวบ่งชี้การประเมิน)
              </label>
              <textarea
                rows={2}
                disabled={isLocked}
                value={item.description || ""}
                onChange={(e) => handleItemChange(index, "description", e.target.value)}
                placeholder="ระบุแนวทางการได้คะแนน เพื่อให้นักเรียนเข้าใจมาตรฐานการประเมิน"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-2 focus:ring-[#D9A441] disabled:opacity-60 transition-all"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Rubric Button */}
      {!isLocked && (
        <button
          type="button"
          onClick={handleAddRubric}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-[#D9CABB] hover:border-[#D9A441] bg-white text-[#8C5D23] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#FFF9F0] transition-all cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          เพิ่มเกณฑ์การให้คะแนนข้อต่อไป
        </button>
      )}
    </div>
  );
}
