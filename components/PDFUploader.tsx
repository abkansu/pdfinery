"use client";

import { useCallback, useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface PDFUploaderProps {
  onFilesSelected: (files: FileList) => void;
  isLoading: boolean;
  acceptedFileTypes?: string;
}

export function PDFUploader({ onFilesSelected, isLoading, acceptedFileTypes }: PDFUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Components.PDFUploader");

  const isFileAccepted = (file: File) => {
    if (acceptedFileTypes) {
      const types = acceptedFileTypes.split(',').map(t => t.trim());
      return types.some(type => {
        if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
        if (type.endsWith('/*')) return file.type.startsWith(type.replace('/*', ''));
        return file.type === type;
      });
    }
    return file.type === "application/pdf";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (isLoading) return;

      const files = e.dataTransfer.files;
      const validFiles = Array.from(files).filter(isFileAccepted);

      if (validFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        validFiles.forEach((file) => dataTransfer.items.add(file));
        onFilesSelected(dataTransfer.files);
      }
    },
    [onFilesSelected, isLoading, acceptedFileTypes]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFilesSelected(files);
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onFilesSelected]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleClick}
          className="flex flex-col items-center justify-center gap-4 cursor-pointer py-8"
        >
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">
              {t("dropText")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("multiSelect")}
            </p>
          </div>
          <Button variant="secondary" disabled={isLoading}>
            <FileText className="mr-2 h-4 w-4" />
            {t("button")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={acceptedFileTypes || "application/pdf"}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}