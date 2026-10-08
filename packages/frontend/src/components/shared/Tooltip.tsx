import { useState, useRef, useEffect } from "react";

interface Props {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export const Tooltip = ({ children, content, position = "top", className = "" }: Props) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      ref={triggerRef}
    >
      {children}
      {isVisible && content && (
        <div
          className={`absolute z-[100] whitespace-nowrap rounded bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg animate-in fade-in zoom-in-95 duration-200 ${posClasses[position]}`}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute h-2 w-2 rotate-45 bg-slate-800 ${
              position === "top"
                ? "bottom-[-4px] left-1/2 -translate-x-1/2"
                : position === "bottom"
                ? "top-[-4px] left-1/2 -translate-x-1/2"
                : position === "left"
                ? "right-[-4px] top-1/2 -translate-y-1/2"
                : "left-[-4px] top-1/2 -translate-y-1/2"
            }`}
          />
        </div>
      )}
    </div>
  );
};
