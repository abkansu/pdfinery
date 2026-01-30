"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mergePDFs, downloadPDF } from "@/lib/pdfUtils";
import type { PDFPage } from "@/lib/types";

interface DownloadButtonProps {
  pages: PDFPage[];
  disabled?: boolean;
}

export function DownloadButton({ pages, disabled }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (pages.length === 0) return;

    setIsDownloading(true);
    try {
      const mergedPdfBytes = await mergePDFs(pages);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadPDF(mergedPdfBytes, `merged-pdf-${timestamp}.pdf`);
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("Failed to merge PDFs. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || pages.length === 0 || isDownloading}
      size="lg"
      className="gap-2"
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Merging...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download Merged PDF ({pages.length} pages)
        </>
      )}
    </Button>
  );
}
