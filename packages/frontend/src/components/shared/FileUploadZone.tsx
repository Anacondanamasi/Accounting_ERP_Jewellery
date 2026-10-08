import { Upload } from "lucide-react";
import { useMemo, useState } from "react";

interface FileUploadZoneProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesSelected: (files: File[]) => void;
}

export const FileUploadZone = ({
  accept,
  multiple = false,
  maxSize = 5 * 1024 * 1024,
  onFilesSelected,
}: FileUploadZoneProps) => {
  const [files, setFiles] = useState<File[]>([]);

  const handleChange = (list: FileList | null) => {
    if (!list) {
      return;
    }
    const selected = Array.from(list).filter((file) => file.size <= maxSize);
    setFiles(selected);
    onFilesSelected(selected);
  };

  const previews = useMemo(
    () =>
      files
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => ({ file, src: URL.createObjectURL(file) })),
    [files],
  );

  return (
    <div className="rounded-card border border-dashed border-border bg-card p-4">
      <label className="grid cursor-pointer place-items-center gap-2 rounded border border-border bg-gold-tint p-6">
        <Upload className="h-5 w-5 text-gold" />
        <div className="text-sm text-charcoal">Drag files here or click to browse</div>
        <input
          accept={accept}
          className="hidden"
          multiple={multiple}
          onChange={(event) => handleChange(event.target.files)}
          type="file"
        />
      </label>
      {files.length ? (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {files.map((file) => (
            <li key={file.name}>{file.name}</li>
          ))}
        </ul>
      ) : null}
      {previews.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {previews.map((preview) => (
            <img
              key={preview.file.name}
              alt={preview.file.name}
              className="h-16 w-16 rounded object-cover"
              src={preview.src}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
