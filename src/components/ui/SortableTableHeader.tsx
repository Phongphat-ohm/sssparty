"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortOrder = "asc" | "desc" | null;

interface SortableTableHeaderProps {
  label: string;
  field: string;
  currentSortField: string | null;
  currentSortOrder: SortOrder;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  field,
  currentSortField,
  currentSortOrder,
  onSort,
  className = "",
}: SortableTableHeaderProps) {
  const isSorted = currentSortField === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={`p-3 text-xs font-bold text-[#5A4D41] select-none cursor-pointer hover:bg-[#FAF0E1]/60 transition-colors group ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <span className="text-[#A8988B] group-hover:text-[#D9A441] transition-colors">
          {isSorted ? (
            currentSortOrder === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-[#D9A441]" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-[#D9A441]" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </div>
    </th>
  );
}
