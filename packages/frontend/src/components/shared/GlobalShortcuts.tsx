import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/appStore";

export const GlobalShortcuts = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tallyMode = useAppStore((state) => state.tallyMode);
  const setShortcutsHelpOpen = useAppStore((state) => state.setShortcutsHelpOpen);
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen);

  const chordRef = useRef<{ prefix: string; timer: any } | null>(null);
  const [activeChord, setActiveChord] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      // 1. Cheat Sheet (? or Ctrl+/)
      if (
        (e.key === "?" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) ||
        (e.key === "/" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
        return;
      }

      // 2. Command Palette (/ when not in input)
      if (e.key === "/" && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // 3. Tally Function Keys (F4 - F9)
      if (tallyMode && !e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
          case "F8": // Sales Invoice
            e.preventDefault();
            toast.info("Tally F8: New Sales Invoice");
            navigate("/invoices/new");
            return;
          case "F9": // Purchase Bill
            e.preventDefault();
            toast.info("Tally F9: New Purchase Bill");
            navigate("/bills/new");
            return;
          case "F7": // Journal Voucher
            e.preventDefault();
            toast.info("Tally F7: New Journal Entry");
            navigate("/journal/new");
            return;
          case "F6": // Receipt Voucher
            e.preventDefault();
            toast.info("Tally F6: Receipt Voucher");
            navigate("/advances/receipts");
            return;
          case "F5": // Payment Voucher
            e.preventDefault();
            toast.info("Tally F5: Payment Voucher");
            navigate("/advances/payments");
            return;
          case "F4": // Contra / Bank Transfer
            e.preventDefault();
            toast.info("Tally F4: Contra / Bank Transfer");
            navigate("/banking/transactions");
            return;
        }
      }

      // 4. Data Soft Refresh (Alt+F5 or F5 if tallyMode is false)
      if ((e.key === "F5" && !tallyMode) || (e.key === "F5" && e.altKey)) {
        e.preventDefault();
        void qc.invalidateQueries();
        toast.success("Data refreshed");
        return;
      }

      // 5. Global Navigation Chords (G + key) & Creation Chords (C + key)
      // Only when NOT inside an input field
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();

        // If no active prefix chord
        if (!chordRef.current) {
          if (key === "g" || key === "c") {
            e.preventDefault();
            const prefix = key;
            setActiveChord(prefix.toUpperCase() + "...");
            const timer = setTimeout(() => {
              chordRef.current = null;
              setActiveChord(null);
            }, 1000);
            chordRef.current = { prefix, timer };
            return;
          }
        } else {
          // A chord is currently active!
          e.preventDefault();
          const { prefix, timer } = chordRef.current;
          clearTimeout(timer);
          chordRef.current = null;
          setActiveChord(null);

          // Handle G + ...
          if (prefix === "g") {
            switch (key) {
              case "d":
                navigate("/");
                return;
              case "s":
                navigate("/invoices");
                return;
              case "b":
                navigate("/bills");
                return;
              case "c":
                navigate("/customers");
                return;
              case "v":
                navigate("/suppliers");
                return;
              case "a":
                navigate("/accounts");
                return;
              case "j":
                navigate("/journal");
                return;
              case "r":
                navigate("/reports");
                return;
              case "k":
                navigate("/banking/accounts");
                return;
              case "i":
                navigate("/inventory/items");
                return;
              case "t":
                navigate("/tax/gst");
                return;
              case "e":
                navigate("/expenses");
                return;
            }
          }

          // Handle C + ...
          if (prefix === "c") {
            switch (key) {
              case "i":
                navigate("/invoices/new");
                return;
              case "b":
                navigate("/bills/new");
                return;
              case "c":
                navigate("/customers/new");
                return;
              case "j":
                navigate("/journal/new");
                return;
              case "e":
                navigate("/expenses/new");
                return;
            }
          }
        }
      }

      // 6. Escape to dismiss modals / backdrop
      if (e.key === "Escape") {
        if (chordRef.current) {
          clearTimeout(chordRef.current.timer);
          chordRef.current = null;
          setActiveChord(null);
          return;
        }

        const isModalOpen =
          document.querySelectorAll(
            '.fixed.z-50, [role="dialog"], dialog[open], [data-radix-popper-content-wrapper]'
          ).length > 0;

        if (!isModalOpen && window.location.pathname !== "/") {
          if (document.querySelector('form[data-dirty="true"]')) {
            if (!confirm("You have unsaved changes. Are you sure you want to go back?")) {
              return;
            }
          }
          navigate(-1);
        }
      }

      // 7. Global Save (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.shiftKey) {
        // Find save button or submit button
        const saveBtn = document.querySelector(
          'button[data-shortcut="save"], button[type="submit"]'
        ) as HTMLButtonElement;
        if (saveBtn) {
          e.preventDefault();
          saveBtn.click();
        }
      }

      // 8. Global Save & New (Ctrl+Enter or Cmd+Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.shiftKey) {
        const saveNewBtn = document.querySelector(
          'button[data-shortcut="save-new"]'
        ) as HTMLButtonElement;
        if (saveNewBtn) {
          e.preventDefault();
          saveNewBtn.click();
        }
      }

      // 9. Global Save & Close (Shift+Ctrl+Enter or Shift+Cmd+Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.shiftKey) {
        const saveCloseBtn = document.querySelector(
          'button[data-shortcut="save-close"]'
        ) as HTMLButtonElement;
        if (saveCloseBtn) {
          e.preventDefault();
          saveCloseBtn.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, qc, tallyMode, setShortcutsHelpOpen, setCommandPaletteOpen]);

  return (
    <>
      {/* Active chord indicator pill */}
      {activeChord && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-gold bg-charcoal px-4 py-2 text-xs font-medium text-gold shadow-2xl animate-pulse">
          <span className="font-mono font-bold text-white">{activeChord}</span>
          <span className="text-slate-300">Press second key...</span>
        </div>
      )}
    </>
  );
};
