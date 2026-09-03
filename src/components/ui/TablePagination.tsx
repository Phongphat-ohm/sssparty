"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // คำนวณช่วงของหมายเลขหน้าที่ต้องการแสดง
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 bg-white border-t border-[#F2E8DC] text-xs text-[#5A4D41]">
      {/* Items Range & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[#7A6A5C]">
          แสดง <strong className="text-[#3F342B]">{startItem}</strong> -{" "}
          <strong className="text-[#3F342B]">{endItem}</strong> จากทั้งหมด{" "}
          <strong className="text-[#3F342B]">{totalItems}</strong> รายการ
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#EADBCC]">
            <span className="text-[#7A6A5C] text-[11px]">แสดงหน้าละ:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 rounded-lg border border-[#D9CABB] bg-[#FAF6F0] text-xs text-[#3F342B] focus:outline-none focus:ring-1 focus:ring-[#D9A441] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="หน้าแรกสุด"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={idx} className="px-2 py-1 text-[#A8988B]">
                ...
              </span>
            ) : (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === p
                    ? "bg-[#D9A441] text-white shadow-2xs"
                    : "border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0]"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="หน้าถัดไป"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-[#EADBCC] text-[#5A4D41] hover:bg-[#FAF6F0] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
