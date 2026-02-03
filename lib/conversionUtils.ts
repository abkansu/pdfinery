import { getPdfjs } from "./pdfUtils";
import JSZip from "jszip";

export interface ConversionResult {
  blob: Blob;
  name: string;
}

/**
 * Load a PDF document from a File object
 */
export async function loadPdf(file: File) {
  const pdfjs = await getPdfjs();
  if (!pdfjs) throw new Error("PDF.js not available");
  
  const arrayBuffer = await file.arrayBuffer();
  // Use structured clone or slice to ensure we don't detach if reused? 
  // arrayBuffer() returns a new buffer usually.
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  return loadingTask.promise;
}

/**
 * Render a specific page of a PDF to an image Blob
 */
export async function renderPageAsImage(
  pdfDoc: any,
  pageNum: number, // 1-based index
  scale: number = 2.0,
  format: "image/png" | "image/jpeg" = "image/png"
): Promise<Blob> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  
  // Create off-screen canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context not available");
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render
  await page.render({
    canvasContext: context,
    viewport: viewport,
    background: "white", // Ensure white background for JPEGs/transparency
  }).promise;
  
  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve) => 
    canvas.toBlob(resolve, format, 0.9) // 0.9 quality for jpeg
  );
  
  // Cleanup
  page.cleanup();
  
  if (!blob) throw new Error("Failed to create image blob");
  return blob;
}

/**
 * Extract text from the entire PDF
 */
export async function extractTextFromPdf(
  pdfDoc: any,
  onProgress?: (current: number, total: number) => void
): Promise<string> {
  const numPages = pdfDoc.numPages;
  let fullText = "";

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      // Basic text extraction - join items with space
      // Improvements could be made by analyzing coordinates for line breaks
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      
      fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
      
      page.cleanup();
    } catch (err) {
      console.error(`Error extracting text from page ${i}`, err);
      fullText += `--- Page ${i} (Error extracting text) ---\n\n`;
    }
    
    if (onProgress) onProgress(i, numPages);
  }
  
  return fullText;
}

/**
 * Create a ZIP file from multiple blobs
 */
export async function createZip(files: ConversionResult[]): Promise<Blob> {
  const zip = new JSZip();
  
  files.forEach((file) => {
    zip.file(file.name, file.blob);
  });
  
  return zip.generateAsync({ type: "blob" });
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
