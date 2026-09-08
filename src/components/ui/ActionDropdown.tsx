"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, MoreVertical } from "lucide-react";

export interface DropdownItem {
  id?: string;
  label: string;
  subLabel?: string;
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  onClick?: () => void;
  href?: string;
  download?: boolean;
  target?: string;
  badge?: string;
  disabled?: boolean;
  variant?: "default" | "danger" | "warning" | "success";
}

export interface DropdownGroup {
  title?: string;
  items: DropdownItem[];
}

export interface ActionDropdownProps {
  trigger?: ReactNode;
  triggerVariant?: "button" | "icon";
  triggerTitle?: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  groups: DropdownGroup[];
  align?: "left" | "right";
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md";
  className?: string;
  menuWidth?: string;
}

export function ActionDropdown({
  trigger,
  triggerVariant = "button",
  triggerTitle = "เมนูเพิ่มเติม",
  label = "ทำรายการ",
  icon: TriggerIcon,
  groups,
  align = "right",
  variant = "outline",
  size = "md",
  className = "",
  menuWidth = "w-56 sm:w-64",
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    maxHeight: number;
    placement: "bottom" | "top";
  }>({ maxHeight: 350, placement: "bottom" });

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    // Prefer bottom placement unless spaceBelow is tight and spaceAbove is larger
    const placement = spaceBelow < 240 && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableHeight = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(160, Math.min(availableHeight, 520));

    const menuW = menuRef.current?.offsetWidth || 260;

    let left: number | undefined = undefined;
    let right: number | undefined = undefined;

    if (align === "left") {
      left = Math.max(8, Math.min(rect.left, viewportWidth - menuW - 8));
    } else {
      right = Math.max(8, Math.min(viewportWidth - rect.right, viewportWidth - menuW - 8));
    }

    if (placement === "bottom") {
      setCoords({
        top: Math.round(rect.bottom + 6),
        left,
        right,
        maxHeight: Math.round(maxHeight),
        placement: "bottom",
      });
    } else {
      setCoords({
        bottom: Math.round(viewportHeight - rect.top + 6),
        left,
        right,
        maxHeight: Math.round(maxHeight),
        placement: "top",
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, align]);

  // Close on outside click (checks both trigger container and portal menu)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const getVariantButtonClass = () => {
    switch (variant) {
      case "primary":
        return "bg-[#D9A441] text-white hover:bg-[#C28F30] border-transparent shadow-xs";
      case "secondary":
        return "bg-[#FAF0E1] text-[#8C5D23] hover:bg-[#F2DFC6] border border-[#EADBCC] shadow-2xs";
      case "ghost":
        return "bg-transparent text-[#5A4D41] hover:bg-[#FAF6F0] border-transparent";
      case "outline":
      default:
        return "bg-white text-[#3F342B] hover:bg-[#FAF6F0] hover:border-[#D9A441] border border-[#D9CABB] shadow-2xs";
    }
  };

  const getSizeButtonClass = () => {
    switch (size) {
      case "sm":
        return "px-2.5 py-1.5 text-xs rounded-xl gap-1.5";
      case "md":
      default:
        return "px-3.5 py-2 text-xs font-semibold rounded-xl gap-2";
    }
  };

  const renderTriggerIcon = () => {
    if (!TriggerIcon) return null;
    if (React.isValidElement(TriggerIcon)) return TriggerIcon;
    const IconComponent = TriggerIcon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="w-4 h-4 shrink-0" />;
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger */}
      {trigger ? (
        <div onClick={handleToggle} className="cursor-pointer">
          {trigger}
        </div>
      ) : triggerVariant === "icon" ? (
        <button
          type="button"
          onClick={handleToggle}
          title={triggerTitle}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
            isOpen
              ? "bg-[#FAF0E1] border-[#D9A441] text-[#8C5D23] shadow-inner"
              : "bg-white border-[#D9CABB] text-[#5A4D41] hover:border-[#D9A441] hover:text-[#D9A441] shadow-2xs"
          }`}
        >
          {TriggerIcon ? (
            renderTriggerIcon()
          ) : (
            <MoreVertical className="w-4 h-4 shrink-0" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={`inline-flex items-center justify-center font-bold transition-all cursor-pointer select-none ${getVariantButtonClass()} ${getSizeButtonClass()}`}
        >
          {renderTriggerIcon()}
          <span>{label}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {/* Menu Dropdown Panel rendered in portal to prevent table overflow clipping */}
      {isOpen && mounted && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                ...(coords.placement === "bottom" && coords.top !== undefined
                  ? { top: coords.top }
                  : {}),
                ...(coords.placement === "top" && coords.bottom !== undefined
                  ? { bottom: coords.bottom }
                  : {}),
                maxHeight: `${coords.maxHeight}px`,
                ...(coords.left !== undefined ? { left: coords.left } : {}),
                ...(coords.right !== undefined ? { right: coords.right } : {}),
                zIndex: 99999,
              }}
              className={`${menuWidth} max-w-[calc(100vw-16px)] overflow-y-auto rounded-2xl bg-white border border-[#EADBCC] shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150 custom-scrollbar`}
            >
              <div className="py-1.5 divide-y divide-[#F2E8DC]/80">
                {groups.map((group, groupIdx) => (
                  <div key={groupIdx} className="py-1">
                    {group.title && (
                      <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#A8988B]">
                        {group.title}
                      </div>
                    )}

                    <div className="space-y-0.5 px-1">
                      {group.items.map((item, itemIdx) => {
                        const ItemIcon = item.icon;
                        const isDanger = item.variant === "danger";
                        const isWarning = item.variant === "warning";
                        const isSuccess = item.variant === "success";

                        const itemClass = `w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          item.disabled
                            ? "opacity-50 cursor-not-allowed"
                            : isDanger
                            ? "text-red-700 hover:bg-red-50"
                            : isWarning
                            ? "text-amber-800 hover:bg-amber-50"
                            : isSuccess
                            ? "text-emerald-800 hover:bg-emerald-50"
                            : "text-[#3F342B] hover:bg-[#FAF6F0] hover:text-[#B94E48]"
                        }`;

                        const renderItemIcon = () => {
                          if (!item.icon) return null;
                          if (React.isValidElement(item.icon)) {
                            return <span className="shrink-0 mt-0.5">{item.icon}</span>;
                          }
                          const IconComp = item.icon as React.ComponentType<{ className?: string }>;
                          return (
                            <IconComp
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isDanger
                                  ? "text-red-500"
                                  : isWarning
                                  ? "text-amber-600"
                                  : isSuccess
                                  ? "text-emerald-600"
                                  : "text-[#8C5D23]"
                              }`}
                            />
                          );
                        };

                        const itemContent = (
                          <>
                            {renderItemIcon()}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-bold truncate">{item.label}</span>
                                {item.badge && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.subLabel && (
                                <p className="text-[10px] text-[#7A6A5C] truncate mt-0.5">
                                  {item.subLabel}
                                </p>
                              )}
                            </div>
                          </>
                        );

                        if (item.href) {
                          return (
                            <a
                              key={itemIdx}
                              href={item.href}
                              download={item.download}
                              target={item.target}
                              onClick={() => {
                                if (!item.disabled) {
                                  setIsOpen(false);
                                  if (item.onClick) item.onClick();
                                }
                              }}
                              className={itemClass}
                            >
                              {itemContent}
                            </a>
                          );
                        }

                        return (
                          <button
                            key={itemIdx}
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                              if (!item.disabled) {
                                setIsOpen(false);
                                if (item.onClick) item.onClick();
                              }
                            }}
                            className={itemClass}
                          >
                            {itemContent}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
