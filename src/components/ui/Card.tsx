import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "interactive";
}

export function Card({
  children,
  className = "",
  variant = "default",
  ...props
}: CardProps) {
  const variantStyles = {
    default: "bg-white border-[#EADBCC] shadow-2xs",
    subtle: "bg-[#FAF6F0] border-[#EADBCC]",
    interactive:
      "bg-white border-[#EADBCC] hover:border-[#D9A441] hover:shadow-md transition-all cursor-pointer",
  };

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border p-5 sm:p-6 font-sans ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`space-y-1 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg sm:text-xl font-bold text-[#3F342B] tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs sm:text-sm text-[#7A6A5C] leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}
