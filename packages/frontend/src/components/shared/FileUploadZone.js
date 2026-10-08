import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Upload } from "lucide-react";
import { useMemo, useState } from "react";
export const FileUploadZone = ({ accept, multiple = false, maxSize = 5 * 1024 * 1024, onFilesSelected, }) => {
    const [files, setFiles] = useState([]);
    const handleChange = (list) => {
        if (!list) {
            return;
        }
        const selected = Array.from(list).filter((file) => file.size <= maxSize);
        setFiles(selected);
        onFilesSelected(selected);
    };
    const previews = useMemo(() => files
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => ({ file, src: URL.createObjectURL(file) })), [files]);
    return (_jsxs("div", { className: "rounded-card border border-dashed border-border bg-card p-4", children: [_jsxs("label", { className: "grid cursor-pointer place-items-center gap-2 rounded border border-border bg-gold-tint p-6", children: [_jsx(Upload, { className: "h-5 w-5 text-gold" }), _jsx("div", { className: "text-sm text-charcoal", children: "Drag files here or click to browse" }), _jsx("input", { accept: accept, className: "hidden", multiple: multiple, onChange: (event) => handleChange(event.target.files), type: "file" })] }), files.length ? (_jsx("ul", { className: "mt-3 space-y-1 text-xs text-muted", children: files.map((file) => (_jsx("li", { children: file.name }, file.name))) })) : null, previews.length ? (_jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: previews.map((preview) => (_jsx("img", { alt: preview.file.name, className: "h-16 w-16 rounded object-cover", src: preview.src }, preview.file.name))) })) : null] }));
};
