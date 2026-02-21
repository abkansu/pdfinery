// Web Worker for structural PDF compression
// Lossless compression using pako and qpdf-wasm

import { getQpdf } from "./qpdf";
import { PDFDocument, PDFStream, decodePDFRawStream, PDFRawStream, PDFName, PDFNumber } from "pdf-lib";
import * as pako from "pako";

// Worker interface
export interface CompressWorkerMessage {
  type: "START";
  payload: {
    fileData: ArrayBuffer;
    removeMetadata: boolean;
  };
}

export interface CompressWorkerResponse {
  type: "PROGRESS" | "SUCCESS" | "ERROR";
  payload?: any;
}

export async function structuralCompress(
  fileData: ArrayBuffer,
  removeMetadata: boolean,
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  console.log('[structuralCompress] Starting compression...');
  console.log('[structuralCompress] File size:', fileData.byteLength);
  
  // Step 1: Load with pdf-lib to manipulate metadata and flate streams
  onProgress?.(10);
  
  console.log('[structuralCompress] Loading PDF with pdf-lib...');
  let pdfDoc = await PDFDocument.load(fileData);
  console.log('[structuralCompress] PDF loaded successfully');
  onProgress?.(30);

  if (removeMetadata) {
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
    
    // To fully strip XMP:
    try {
        pdfDoc.catalog.delete(pdfDoc.context.obj("Metadata"));
    } catch(e) {}
  }

  onProgress?.(40);

  // Recompress all Flate streams using pako with highest compression level
  const context = pdfDoc.context;
  const indirectObjects = context.enumerateIndirectObjects();
  
  let totalStreams = 0;
  let processedStreams = 0;

  for (const [ref, obj] of indirectObjects) {
    if (obj instanceof PDFRawStream) {
        totalStreams++;
    }
  }

  for (const [ref, obj] of indirectObjects) {
    if (obj instanceof PDFRawStream) {
        try {            
            // We can decompress and recompress
            const decoded = decodePDFRawStream(obj).decode();
            const recompressed = pako.deflate(decoded, { level: 9 }); // Highest compression
            
            // Create new stream
            obj.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
            obj.dict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length));
            const newStream = PDFRawStream.of(obj.dict, recompressed);
            context.assign(ref, newStream);
        } catch (e) {
            // Ignore streams that can't be decoded/recompressed
            console.warn("[structuralCompress] Could not recompress stream", e);
        }
        
        processedStreams++;
        if (totalStreams > 0 && processedStreams % 10 === 0) {
            onProgress?.(40 + Math.round((processedStreams / totalStreams) * 20));
        }
    }
  }

  onProgress?.(60);

  console.log('[structuralCompress] Saving PDF...');
  // Rewrite PDF to eliminate incremental updates
  const cleanPdfBytes = await pdfDoc.save({ useObjectStreams: false });
  console.log('[structuralCompress] PDF saved, size:', cleanPdfBytes.length);
  
  onProgress?.(70);

  console.log('[structuralCompress] Loading qpdf...');
  // Step 2: Use qpdf to optimize streams and generate object streams
  const qpdf = await getQpdf();
  console.log('[structuralCompress] qpdf loaded successfully');
  const inputFileName = `input_${Date.now()}.pdf`;
  const outputFileName = `output_${Date.now()}.pdf`;

  qpdf.FS.writeFile(inputFileName, cleanPdfBytes);

  onProgress?.(80);
  
  const args = [
    inputFileName,
    outputFileName,
    "--object-streams=generate",
    "--stream-data=compress"
  ];

  console.log('[structuralCompress] Running qpdf with args:', args);
  let exitCode = -1;
  try {
    exitCode = qpdf.callMain(args);
  } catch (err) {
    console.error('[structuralCompress] Error calling qpdf main:', err);
    throw err;
  }

  if (exitCode !== 0) {
    throw new Error(`qpdf exited with code ${exitCode}`);
  }

  const optimizedBytes = qpdf.FS.readFile(outputFileName);

  // Cleanup
  try {
    if (typeof qpdf.FS.unlink === 'function') {
      qpdf.FS.unlink(inputFileName);
      qpdf.FS.unlink(outputFileName);
    } else if (typeof (qpdf.FS as any).unlinkSync === 'function') {
      (qpdf.FS as any).unlinkSync(inputFileName);
      (qpdf.FS as any).unlinkSync(outputFileName);
    }
  } catch (e) {
    console.warn("Cleanup error (ignored):", e);
  }

  onProgress?.(100);

  return optimizedBytes;
}
