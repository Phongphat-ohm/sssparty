import React from "react";

export default function StudentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="h-36 sm:h-44 bg-[#FAF0E1] border border-[#EADBCC] rounded-3xl p-6 flex flex-col justify-center space-y-3">
        <div className="h-4 w-36 bg-[#D9A441]/20 rounded-full" />
        <div className="h-8 w-64 bg-[#D9A441]/30 rounded-2xl" />
        <div className="h-4 w-48 bg-[#D9A441]/20 rounded-xl" />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-5 border border-[#EADBCC] space-y-4 shadow-2xs"
          >
            <div className="flex justify-between items-start">
              <div className="h-6 w-24 bg-[#EADBCC]/50 rounded-full" />
              <div className="h-4 w-12 bg-[#EADBCC]/30 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-[#EADBCC]/60 rounded-xl" />
              <div className="h-3.5 w-full bg-[#EADBCC]/30 rounded-md" />
            </div>
            <div className="pt-3 border-t border-[#F2E8DC] flex justify-between items-center">
              <div className="h-4 w-20 bg-[#EADBCC]/40 rounded-md" />
              <div className="h-8 w-24 bg-[#D9A441]/20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
