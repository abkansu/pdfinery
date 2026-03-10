"use client";

import { useCallback, useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface PDFUploaderProps {
  onFilesSelected: (files: FileList) => void;
  isLoading: boolean;
  accept?: string;
  allowedExtensions?: string[];
  dropTextKey?: string;
  buttonTextKey?: string;
}

export function PDFUploader({ 
  onFilesSelected, 
  isLoading,
  accept = "application/pdf",
  allowedExtensions = [".pdf"],
  dropTextKey = "dropText",
  buttonTextKey = "button"
}: PDFUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Components.PDFUploader");

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (isLoading) return;

      const files = e.dataTransfer.files;
      const validFiles = Array.from(files).filter(
        (file) => {
          if (allowedExtensions.length === 0) return true;
          return allowedExtensions.some(ext => {
            if (ext.startsWith(".")) {
              return file.name.toLowerCase().endsWith(ext.toLowerCase());
            }
            if (ext.includes("/*")) {
              return file.type.startsWith(ext.replace("/*", ""));
            }
            return file.type === ext || file.name.toLowerCase().endsWith(ext.toLowerCase());
          });
        }
      );

      if (validFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        validFiles.forEach((file) => dataTransfer.items.add(file));
        onFilesSelected(dataTransfer.files);
      }
    },
    [onFilesSelected, isLoading]
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
              {t(dropTextKey as any)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("multiSelect")}
            </p>
          </div>
          <Button variant="secondary" disabled={isLoading}>
            <FileText className="mr-2 h-4 w-4" />
            {t(buttonTextKey as any)}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
}