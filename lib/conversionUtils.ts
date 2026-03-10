import { getPdfjs } from "./pdfUtils";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

/**
 * Convert Image or Text/Markdown to PDF
 */
export async function convertToPdf(file: File): Promise<{ blob: Blob; numPages: number }> {
  const pdfDoc = await PDFDocument.create();

  if (file.type.startsWith('image/')) {
    const imageBytes = await file.arrayBuffer();
    let image;
    if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      throw new Error("Unsupported image format. Please use PNG or JPEG.");
    }
    
    // Scale image to fit A4 if needed, or just create page of image size
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  /* } else if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
    const text = await file.text();
    const { marked } = await import('marked');
    const html2pdf = (await import('html2pdf.js')).default;
    
    const htmlContent = await Promise.resolve(marked.parse(text));
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent as string;
    
    // Basic styling for better PDF output
    container.style.padding = '40px';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.lineHeight = '1.6';
    container.style.color = '#000';
    container.style.background = '#ffffff';
    container.style.boxSizing = 'border-box';
    container.style.width = '794px';
    
    // Create a wrapper to isolate it from the rest of the document
    const wrapper = document.createElement('div');
    wrapper.id = 'pdf-container-wrapper';
    
    // Make sure it takes up physical space so html2canvas computes the layout properly
    // We use fixed positioning off-screen but keep opacity at 0.01 so it renders.
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '794px';
    wrapper.style.background = '#ffffff';
    wrapper.style.zIndex = '-9999';
    wrapper.style.opacity = '0.01';
    
    wrapper.appendChild(container);

    // Some tag-specific styling
    const styleEl = document.createElement('style');
    styleEl.innerHTML = \`
      h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
      h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
      p, blockquote, ul, ol, dl, table, pre, details { margin-top: 0; margin-bottom: 16px; }
      code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 85%; background-color: rgba(27,31,35,.05); border-radius: 3px; padding: .2em .4em; }
      pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #f6f8fa; border-radius: 3px; }
      pre code { background-color: transparent; padding: 0; }
      table { border-spacing: 0; border-collapse: collapse; }
      table th, table td { padding: 6px 13px; border: 1px solid #dfe2e5; }
      table tr:nth-child(2n) { background-color: #f6f8fa; }
      blockquote { padding: 0 1em; color: #6a737d; border-left: .25em solid #dfe2e5; }
    \`;
    wrapper.appendChild(styleEl);
    document.body.appendChild(wrapper);

    try {
      // Need a small timeout to let the DOM settle before html2canvas runs
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pdfBlob = await html2pdf().set({
        margin: [15, 15],
        filename: 'converted.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true, 
          backgroundColor: '#ffffff', 
          scrollY: 0,
          windowWidth: 800,
          onclone: (clonedDoc: any) => {
            const el = clonedDoc.getElementById('pdf-container-wrapper');
            if (el) {
                el.style.opacity = '1';
                el.style.position = 'absolute';
                el.style.left = '0';
                el.style.top = '0';
                el.style.zIndex = 'auto';
            }
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }).from(wrapper).output('blob');

      // We need numPages to stay compatible with existing code
      const arrayBuffer = await pdfBlob.arrayBuffer();
      let loadedPdf;
      try {
        loadedPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      } catch (err) {
        console.error("Failed to parse generated HTML PDF", err);
        return { blob: pdfBlob, numPages: 1 };
      }
      
      return {
        blob: pdfBlob,
        numPages: loadedPdf.getPageCount()
      };
    } finally {
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    } */
  } else if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    const text = await file.text();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSize = 12;
    
    // Create first page
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - 40;
    
    const lines = text.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/[^\x00-\x7F]/g, ""); 
      
      if (!cleanLine.trim()) {
        y -= 15;
        if (y < 40) {
          page = pdfDoc.addPage();
          y = height - 40;
        }
        continue;
      }

      const words = cleanLine.split(' ');
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        let word = words[i];

        while (word.length > 0) {
          const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
          const testWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);

          if (testWidth > width - 80) {
            if (currentLine !== '') {
              // Draw the current line and start a new one
              if (y < 40) {
                page = pdfDoc.addPage();
                y = height - 40;
              }
              page.drawText(currentLine, { x: 40, y, size: fontSize, font: timesRomanFont, color: rgb(0, 0, 0) });
              y -= 15;
              currentLine = '';
            } else {
              // Word is too long to fit on one line, wrap by character
              let splitIndex = word.length;
              while (splitIndex > 0 && timesRomanFont.widthOfTextAtSize(word.substring(0, splitIndex), fontSize) > width - 80) {
                splitIndex--;
              }
              if (splitIndex === 0) splitIndex = 1; // Ensure at least 1 char

              if (y < 40) {
                page = pdfDoc.addPage();
                y = height - 40;
              }
              page.drawText(word.substring(0, splitIndex), { x: 40, y, size: fontSize, font: timesRomanFont, color: rgb(0, 0, 0) });
              y -= 15;

              word = word.substring(splitIndex);
            }
          } else {
            currentLine = testLine;
            word = ''; // Word added completely
          }
        }
      }

      if (currentLine !== '') {
        if (y < 40) {
          page = pdfDoc.addPage();
          y = height - 40;
        }
        page.drawText(currentLine, { x: 40, y, size: fontSize, font: timesRomanFont, color: rgb(0, 0, 0) });
        y -= 15;
      }
    }
  } else {
    throw new Error("Unsupported file type for To-PDF conversion");
  }

  const pdfBytes = await pdfDoc.save();
  return {
    blob: new Blob([pdfBytes as any], { type: 'application/pdf' }),
    numPages: pdfDoc.getPageCount()
  };
}
