import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base styles: accessible 44px touch target on mobile, smooth transitions, Kanit font
    const baseStyles =
      "inline-flex items-center justify-center font-bold font-sans rounded-xl transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[44px]";

    const variantStyles = {
      primary:
        "bg-[#D9A441] text-[#3F342B] hover:bg-[#C89535] active:scale-[0.99] shadow-2xs hover:shadow-xs focus-visible:ring-[#8C5D23]",
      secondary:
        "bg-[#FAF6F0] text-[#3F342B] border border-[#D9CABB] hover:bg-[#F3ECE2] active:scale-[0.99] shadow-2xs focus-visible:ring-[#D9A441]",
      destructive:
        "bg-[#B94E48] text-white hover:bg-[#A33F39] active:scale-[0.99] shadow-2xs hover:shadow-xs focus-visible:ring-[#B94E48]",
      outline:
        "bg-transparent text-[#3F342B] border border-[#EADBCC] hover:bg-[#FAF6F0] active:scale-[0.99] focus-visible:ring-[#D9A441]",
      ghost:
        "bg-transparent text-[#5A4D41] hover:text-[#3F342B] hover:bg-[#FAF6F0] active:scale-[0.99] focus-visible:ring-[#D9A441]",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-3 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>กำลังดำเนินการ...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
