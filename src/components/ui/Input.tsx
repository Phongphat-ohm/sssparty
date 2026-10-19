import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, id, className = "", ...props }, ref) => {
    // Generate fallback id for label binding if not provided
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className="space-y-1.5 font-sans w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#5A4D41]"
          >
            {label}
            {props.required && <span className="text-[#B94E48] ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[#7A6A5C]">
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full py-2.5 rounded-xl border bg-[#FAF6F0] text-base sm:text-sm text-[#3F342B] placeholder-[#7A6A5C] transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#D9A441] focus:border-transparent ${
              leftIcon ? "pl-10 pr-4" : "px-4"
            } ${
              error
                ? "border-[#B94E48] focus:ring-[#B94E48]"
                : "border-[#D9CABB] hover:border-[#CBB8A4]"
            } ${className}`}
            {...props}
          />
        </div>

        {hint && !error && <p className="text-[11px] text-[#7A6A5C]">{hint}</p>}
        {error && <p className="text-[11px] font-semibold text-[#B94E48]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
