import { PDFDocument } from "pdf-lib";
import type { PDFPage } from "./types";

// Dynamically import pdfjs to avoid SSR issues
let pdfjsLib: typeof import("pdfjs-dist") | null = null;

export async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  
  if (typeof window !== "undefined") {
    pdfjsLib = await import("pdfjs-dist");
    // Configure worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  }
  
  return pdfjsLib;
}

/**
 * Extract all pages from a PDF file
 */
// Simple unique ID generator
let idCounter = 0;
function generateUniqueId(): string {
  return `page-${Date.now()}-${idCounter++}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function extractPagesFromPDF(
  file: File,
  fileIndex: number
): Promise<PDFPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pageCount = pdfDoc.getPageCount();
  const pages: PDFPage[] = [];

  for (let i = 0; i < pageCount; i++) {
    // Create a new PDF with just this page
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
    singlePagePdf.addPage(copiedPage);

    const pdfBytes = await singlePagePdf.save();
    const pageObj = pdfDoc.getPage(i);
    const { width, height } = pageObj.getSize();

    pages.push({
      id: generateUniqueId(),
      pageIndex: i,
      sourceFileIndex: fileIndex,
      sourceFileName: file.name,
      pdfBytes: pdfBytes,
      thumbnail: null,
      width,
      height,
    });
  }

  return pages;
}

/**
 * Generate thumbnail for a PDF page
 */
export async function generateThumbnail(
  pdfBytes: Uint8Array,
  maxWidth: number = 150,
  maxHeight: number = 200
): Promise<string> {
  const pdfjs = await getPdfjs();
  if (!pdfjs) throw new Error("PDF.js not available");

  const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height);
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({
    canvasContext: context,
    viewport: scaledViewport,
  }).promise;

  const dataUrl = canvas.toDataURL("image/png");
  
  // Cleanup
  page.cleanup();
  await pdf.destroy();
  
  return dataUrl;
}

/**
 * Render a PDF page to canvas at full size
 */
export async function renderPageToCanvas(
  pdfBytes: Uint8Array,
  canvas: HTMLCanvasElement,
  maxWidth: number = 800,
  maxHeight: number = 1000,
  pageNumber: number = 1
): Promise<{ promise: Promise<void>; cancel: () => void }> {
  const pdfjs = await getPdfjs();
  if (!pdfjs) throw new Error("PDF.js not available");

  const loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() });
  let renderTask: any = null;
  let isCancelled = false;

  const promise = (async () => {
    try {
      const pdf = await loadingTask.promise;
      if (isCancelled) {
        pdf.destroy();
        return;
      }

      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height, 2);
      const scaledViewport = page.getViewport({ scale });

      const context = canvas.getContext("2d")!;
      // Clear canvas before starting new render
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      renderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport,
      });

      await renderTask.promise;

      // Cleanup
      page.cleanup();
      await pdf.destroy();
    } catch (error: any) {
      if (error?.name === "RenderingCancelledException") {
        // Ignore cancellation errors
        return;
      }
      throw error;
    }
  })();

  return {
    promise,
    cancel: () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
      loadingTask.destroy();
    }
  };
}

/**
 * Merge all pages into a single PDF in the given order
 */
export async function mergePDFs(pages: PDFPage[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const page of pages) {
    const sourcePdf = await PDFDocument.load(page.pdfBytes);
    const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [0]);
    mergedPdf.addPage(copiedPage);
  }

  return mergedPdf.save();
}

/**
 * Trigger download of merged PDF
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string = "merged.pdf"): void {
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
