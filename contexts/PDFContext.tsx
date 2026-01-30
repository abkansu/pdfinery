"use client";

import { createContext, useContext } from "react";
import type { PDFPage, UploadedFile } from "@/lib/types";

interface PDFContextType {
  pages: PDFPage[];
  uploadedFiles: UploadedFile[];
  selectedIndex: number;
  isLoading: boolean;
  loadingMessage: string;
  addFiles: (files: FileList) => Promise<void>;
  setPages: (pages: PDFPage[]) => void;
  setUploadedFiles: (files: UploadedFile[]) => void;
  setSelectedIndex: (index: number) => void;
  deletePage: (index: number) => void;
  clearAll: () => void;
}

export const PDFContext = createContext<PDFContextType | undefined>(undefined);

export function usePDF() {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error("usePDF must be used within a PDFProvider");
  }
  return context;
}
