import { useEffect, useRef } from "react";

export interface UseHardwareScannerOptions {
  onScan: (scannedCode: string) => void;
  enabled?: boolean;
  maxIntervalMs?: number;
  minChars?: number;
  onToggleScanMode?: () => void;
}

export function useHardwareScanner({
  onScan,
  enabled = true,
  maxIntervalMs = 40,
  minChars = 3,
  onToggleScanMode,
}: UseHardwareScannerOptions) {
  const bufferRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const isBurstRef = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut: Ctrl+Shift+B to toggle scan mode or open camera
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        onToggleScanMode?.();
        return;
      }

      const now = performance.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key indicates end of barcode transmission from hardware scanner
      if (e.key === "Enter") {
        if (bufferRef.current.length >= minChars && isBurstRef.current) {
          e.preventDefault();
          e.stopPropagation();

          const scanned = bufferRef.current.join("").trim();
          bufferRef.current = [];
          isBurstRef.current = false;

          if (scanned) {
            onScan(scanned);
          }
          return;
        }

        // Reset if normal human enter
        bufferRef.current = [];
        isBurstRef.current = false;
        return;
      }

      // Ignore special modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        return;
      }

      // Scanner keystroke timing check
      if (interval <= maxIntervalMs) {
        // High speed keystroke - scanner burst detected
        isBurstRef.current = true;
        bufferRef.current.push(e.key);
      } else {
        // Gap too long: reset buffer and start fresh
        bufferRef.current = [e.key];
        isBurstRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [enabled, maxIntervalMs, minChars, onScan, onToggleScanMode]);
}
