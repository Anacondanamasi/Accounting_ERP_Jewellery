import { useNavigate } from "react-router-dom";
import { useShortcut } from "@/hooks/useShortcut";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
export const GlobalShortcuts = () => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    // Soft Refresh (F5)
    useShortcut({ key: "F5" }, (e) => {
        e.preventDefault();
        void qc.invalidateQueries();
        toast.success("Data refreshed");
    }, { ignoreInInputs: false });
    // Dashboard
    useShortcut({ key: "h", altKey: true }, () => navigate("/"), { preventDefault: true });
    // Back (Alt + Left)
    useShortcut({ key: "ArrowLeft", altKey: true }, () => {
        // Check for unsaved changes (rudimentary check for dirty forms - assumes classes like .is-dirty)
        if (document.querySelector('form[data-dirty="true"]')) {
            if (!confirm("You have unsaved changes. Are you sure you want to go back?")) {
                return;
            }
        }
        navigate(-1);
    });
    // ESC: close modals or navigate back
    useShortcut({ key: "Escape" }, () => {
        // If any modal, dropdown, or command palette is open, do NOT navigate back.
        // Let those components handle closing themselves.
        const isModalOpen = document.querySelectorAll('.fixed.z-50, [role="dialog"], dialog[open], [data-radix-popper-content-wrapper]').length > 0;
        if (isModalOpen) {
            // We don't go back. Modals handle their own ESC to close.
            return;
        }
        // Only navigate back if we aren't on the root
        if (window.location.pathname !== "/") {
            if (document.querySelector('form[data-dirty="true"]')) {
                if (!confirm("You have unsaved changes. Are you sure you want to go back?")) {
                    return;
                }
            }
            navigate(-1);
        }
    });
    // Export (Ctrl + Shift + E)
    useShortcut({ key: "e", ctrlKey: true, shiftKey: true }, () => {
        // Attempt to click any visible export button, or notify
        const exportBtn = document.querySelector('button[title*="Export"], button[aria-label*="Export"]');
        if (exportBtn) {
            exportBtn.click();
        }
        else {
            toast.info("No export available on this page.");
        }
    });
    // Print (Ctrl + P)
    useShortcut({ key: "p", ctrlKey: true }, (e) => {
        const printBtn = document.querySelector('button[title*="Print"], button[aria-label*="Print"]');
        if (printBtn) {
            e.preventDefault();
            printBtn.click();
        }
        else {
            // Let browser default print happen if no custom print button
        }
    }, { preventDefault: false }); // Do not prevent default so browser print works if we don't handle it
    // Save (Ctrl + S)
    useShortcut({ key: "s", ctrlKey: true }, (e) => {
        const saveBtn = document.querySelector('button[type="submit"]');
        if (saveBtn) {
            e.preventDefault();
            saveBtn.click();
        }
        else {
            toast.info("No save action available here.");
        }
    }, { ignoreInInputs: false });
    // Submit (Ctrl + Enter)
    useShortcut({ key: "Enter", ctrlKey: true }, (e) => {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            e.preventDefault();
            submitBtn.click();
        }
    }, { ignoreInInputs: false }); // Needs to work even when inside an input!
    // New Record (Ctrl + N)
    useShortcut({ key: "n", ctrlKey: true }, (e) => {
        // Try to find a link ending with /new or a button containing 'New'
        const newBtn = document.querySelector('a[href$="/new"], button[title*="New"], button[aria-label*="New"], a[title*="New"]');
        if (newBtn) {
            e.preventDefault();
            newBtn.click();
        }
        else {
            toast.info("Cannot create a new record here.");
        }
    });
    // Edit (Ctrl + E)
    useShortcut({ key: "e", ctrlKey: true }, (e) => {
        const editBtn = document.querySelector('a[href$="/edit"], button[title*="Edit"], button[aria-label*="Edit"]');
        if (editBtn) {
            e.preventDefault();
            editBtn.click();
        }
    });
    // Delete (Ctrl + Delete)
    useShortcut({ key: "Delete", ctrlKey: true }, (e) => {
        const delBtn = document.querySelector('button[title*="Delete"], button[aria-label*="Delete"], button[title*="Void"], button[aria-label*="Void"]');
        if (delBtn) {
            e.preventDefault();
            delBtn.click();
        }
    });
    // Search (Ctrl + F)
    useShortcut({ key: "f", ctrlKey: true }, (e) => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]');
        if (searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        else {
            // Allow default browser search if no app search
        }
    }, { preventDefault: false }); // Allow browser default if app search fails
    return null;
};
