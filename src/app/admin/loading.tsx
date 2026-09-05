import React from "react";

export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-[#EADBCC]/60 rounded-2xl" />
          <div className="h-4 w-72 bg-[#EADBCC]/40 rounded-xl" />
        </div>
        <div className="h-10 w-36 bg-[#EADBCC]/50 rounded-xl" />
      </div>

      {/* Stat Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl p-5 border border-[#EADBCC] space-y-3 shadow-2xs"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-20 bg-[#EADBCC]/40 rounded-lg" />
              <div className="h-8 w-8 bg-[#EADBCC]/50 rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-[#EADBCC]/60 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Main Content card skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-[#EADBCC] space-y-4 shadow-2xs">
        <div className="flex justify-between items-center pb-4 border-b border-[#F2E8DC]">
          <div className="h-5 w-40 bg-[#EADBCC]/50 rounded-xl" />
          <div className="h-8 w-48 bg-[#EADBCC]/30 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 bg-[#FAF6F0] rounded-2xl border border-[#EADBCC]/40 flex items-center px-4 justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EADBCC]/50" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-[#EADBCC]/60 rounded-md" />
                  <div className="h-2.5 w-24 bg-[#EADBCC]/40 rounded-md" />
                </div>
              </div>
              <div className="h-6 w-20 bg-[#EADBCC]/40 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
