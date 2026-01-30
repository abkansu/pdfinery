"use client";

import { useState, useCallback, ReactNode } from "react";
import { PDFContext } from "@/contexts/PDFContext";
import { extractPagesFromPDF } from "@/lib/pdfUtils";
import type { PDFPage, UploadedFile } from "@/lib/types";

export function PDFProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [uploadedFiles, setUploadedFilesState] = useState<UploadedFile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const addFiles = useCallback(async (files: FileList) => {
    setIsLoading(true);
    setLoadingMessage("Processing PDF files...");

    try {
      const fileArray = Array.from(files);
      const newPages: PDFPage[] = [];
      const newUploadedFiles: UploadedFile[] = [];
      
      // Calculate start index for new pages
      // We need to keep track of the total page count to correctly index new pages
      // But we can't easily rely on pages.length because pages might be reordered/deleted
      // So we will just use a running counter for the extraction
      let extractionStartIndex = pages.length;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setLoadingMessage(`Processing ${file.name} (${i + 1}/${fileArray.length})...`);
        
        const extractedPages = await extractPagesFromPDF(file, i); // sourceFileIndex is technically not unique across batches but fine for now
        
        // Add to new pages
        newPages.push(...extractedPages);
        
        // Create uploaded file entry
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
      
      // Select the first new page if no pages were selected before
      if (pages.length === 0 && newPages.length > 0) {
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error("Error processing PDFs:", error);
      alert("Failed to process PDF files. Please make sure they are valid PDF files.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, [pages.length]);

  const setUploadedFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFilesState(files);
    
    // When files are reordered, we want to reset the pages to match the file order
    // This implements the "Yes, reordering files resets the page order" requirement
    const sortedPages = files.flatMap(file => file.pages);
    setPages(sortedPages);
    setSelectedIndex(0);
  }, []);

  const deletePage = useCallback((index: number) => {
    setPages((prev) => {
      const newPages = prev.filter((_, i) => i !== index);
      
      // Adjust selected index if needed
      if (newPages.length === 0) {
        setSelectedIndex(0);
      } else if (index <= selectedIndex) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
      
      return newPages;
    });
  }, [selectedIndex]);

  const clearAll = useCallback(() => {
    if (confirm("Are you sure you want to remove all pages?")) {
      setPages([]);
      setUploadedFilesState([]);
      setSelectedIndex(0);
    }
  }, []);

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
