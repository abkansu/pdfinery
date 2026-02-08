"use client";

import { useState, useCallback, ReactNode } from "react";
import { PDFContext } from "@/contexts/PDFContext";
import { extractPagesFromPDF } from "@/lib/pdfUtils";
import type { PDFPage, UploadedFile } from "@/lib/types";
import { useTranslations } from "next-intl";

export function PDFProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [uploadedFiles, setUploadedFilesState] = useState<UploadedFile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const t = useTranslations("Components.PDFProvider");

  const addFiles = useCallback(async (files: FileList) => {
    setIsLoading(true);
    setLoadingMessage(t("processing"));

    try {
      const fileArray = Array.from(files);
      const newPages: PDFPage[] = [];
      const newUploadedFiles: UploadedFile[] = [];
      
      let extractionStartIndex = pages.length;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setLoadingMessage(t("processingFile", { filename: file.name, current: i + 1, total: fileArray.length }));
        
        const extractedPages = await extractPagesFromPDF(file, i);
        
        newPages.push(...extractedPages);
        
        newUploadedFiles.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          file: file,
          pageCount: extractedPages.length,
          timestamp: Date.now(),
          pages: extractedPages
        });
        
        extractionStartIndex += extractedPages.length;
      }

      setUploadedFilesState(prev => [...prev, ...newUploadedFiles]);
      setPages(prev => [...prev, ...newPages]);
      
      if (pages.length === 0 && newPages.length > 0) {
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Error processing PDFs:", error);
      alert(t("error"));
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, [pages.length, t]);

  const setUploadedFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFilesState(files);
    const sortedPages = files.flatMap(file => file.pages);
    setPages(sortedPages);
    setSelectedIndex(0);
  }, []);

  const deletePage = useCallback((index: number) => {
    setPages((prev) => {
      const newPages = prev.filter((_, i) => i !== index);
      if (newPages.length === 0) {
        setSelectedIndex(0);
      } else if (index <= selectedIndex) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
      return newPages;
    });
  }, [selectedIndex]);

  const clearAll = useCallback(() => {
    if (confirm(t("confirmClear"))) {
      setPages([]);
      setUploadedFilesState([]);
      setSelectedIndex(0);
    }
  }, [t]);

  return (
    <PDFContext.Provider
      value={{
        pages,
        uploadedFiles,
        selectedIndex,
        isLoading,
        loadingMessage,
        addFiles,
        setPages,
        setUploadedFiles,
        setSelectedIndex,
        deletePage,
        clearAll,
      }}
    >
      {children}
    </PDFContext.Provider>
  );
}