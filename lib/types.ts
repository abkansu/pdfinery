export interface PDFPage {
  id: string;
  pageIndex: number;
  sourceFileIndex: number;
  sourceFileName: string;
  pdfBytes: Uint8Array;
  thumbnail: string | null;
  width: number;
  height: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  file: File;
  pageCount: number;
  timestamp: number;
  pages: PDFPage[];
}

export interface AppState {
  pages: PDFPage[];
  selectedPageIndex: number;
  isLoading: boolean;
  loadingMessage: string;
}
