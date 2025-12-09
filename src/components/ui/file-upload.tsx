"use client";

import { useCallback } from "react";
import { useUploadFiles } from "@better-upload/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  url: string;
  filename: string;
  size?: number;
  type?: string;
}

interface FileUploadProps {
  route: string;
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  accept?: string;
  className?: string;
}

function getFileIcon(type?: string) {
  if (!type) return File;
  if (type.startsWith("image/")) return FileImage;
  if (type.includes("pdf") || type.includes("document")) return FileText;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return FileSpreadsheet;
  return File;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  route,
  value = [],
  onChange,
  maxFiles = 10,
  disabled = false,
  accept,
  className,
}: FileUploadProps) {
  const {
    upload,
    reset,
    uploadedFiles,
    failedFiles,
    progresses,
    isPending,
    averageProgress,
  } = useUploadFiles({
    route,
    onUploadComplete: async ({ files }) => {
      // Get presigned URLs for each uploaded file (valid for 90 days)
      const newFiles: UploadedFile[] = await Promise.all(
        files.map(async (f) => {
          try {
            // Call our API to generate a presigned URL
            const response = await fetch("/api/upload/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: f.objectInfo.key }),
            });

            if (!response.ok) {
              throw new Error("Failed to get presigned URL");
            }

            const { presignedUrl } = await response.json();

            return {
              url: presignedUrl,
              filename: f.raw.name,
              size: f.raw.size,
              type: f.raw.type,
            };
          } catch {
            // Fallback to direct URL (may not work for Airtable but at least shows the file)
            return {
              url: `https://REDACTED_STORAGE_URL/${f.objectInfo.key}`,
              filename: f.raw.name,
              size: f.raw.size,
              type: f.raw.type,
            };
          }
        })
      );

      onChange?.([...value, ...newFiles]);
      reset();
    },
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        // Check if adding these files would exceed the limit
        const remainingSlots = maxFiles - value.length;
        if (remainingSlots <= 0) return;

        const filesToUpload = Array.from(files).slice(0, remainingSlots);
        upload(filesToUpload);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [upload, maxFiles, value.length]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const newFiles = [...value];
      newFiles.splice(index, 1);
      onChange?.(newFiles);
    },
    [value, onChange]
  );

  const canAddMore = value.length < maxFiles && !disabled;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Existing files */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={`${file.url}-${index}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.filename}</p>
                  {file.size && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  )}
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload progress */}
      {isPending && (
        <div className="space-y-2">
          {Object.entries(progresses).map(([fileName, progress]) => {
            const progressNum = typeof progress === "number" ? progress : 0;
            return (
              <div
                key={fileName}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <Progress value={progressNum * 100} className="h-1 mt-1" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(progressNum * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Failed files */}
      {failedFiles.length > 0 && (
        <div className="space-y-2">
          {failedFiles.map((file, index) => (
            <div
              key={`failed-${index}`}
              className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3"
            >
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.raw.name}</p>
                <p className="text-xs text-destructive">Failed to upload</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canAddMore && (
        <label
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors",
            "hover:border-primary hover:bg-muted/50",
            isPending && "pointer-events-none opacity-50"
          )}
        >
          <input
            type="file"
            multiple
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled || isPending}
            className="sr-only"
          />
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Uploading... {Math.round(averageProgress * 100)}%
              </span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to upload files
                {maxFiles > 1 && ` (${value.length}/${maxFiles})`}
              </span>
            </>
          )}
        </label>
      )}
    </div>
  );
}
