import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "gold" | "success" | "danger" | "neutral" | "terracotta";
}

export function Badge({
  children,
  className = "",
  variant = "gold",
  ...props
}: BadgeProps) {
  const variantStyles = {
    // High-contrast Roasted Ochre for gold variant
    gold: "bg-[#D9A441]/15 text-[#8C5D23] border-[#D9A441]/30",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    neutral: "bg-[#FAF0E1] text-[#7A6A5C] border-[#EADBCC]",
    terracotta: "bg-[#C96B4B]/15 text-[#A2482A] border-[#C96B4B]/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border font-sans select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
