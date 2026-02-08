"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Upload, Type, Pen, X, Download, Undo, 
  ZoomIn, ZoomOut, Trash, Move, Check, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPdfjs } from "@/lib/pdfUtils";
import { PDFDocument } from "pdf-lib";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useTranslations } from "next-intl";

// --- Types ---

interface Signature {
  id: string;
  pageIndex: number; // 0-based
  x: number; // visual x (relative to scaled page)
  y: number; // visual y (relative to scaled page)
  width: number; // visual width
  height: number; // visual height
  dataUrl: string;
}

type SignatureType = "draw" | "type" | "upload";

// --- Components ---

// 1. Signature Pad (Drawing)
const SignaturePad = ({ onSave, onCancel, t }: { onSave: (dataUrl: string) => void; onCancel: () => void; t: any }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Trim transparency? For now just export the whole canvas (it's transparent by default)
    // To make it better, we could crop to content, but keeping it simple for now.
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border rounded-md bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          className="w-full h-[200px] touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={clear} disabled={!hasContent}>{t("modal.buttons.clear")}</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>{t("modal.buttons.cancel")}</Button>
          <Button onClick={handleSave} disabled={!hasContent}>{t("modal.buttons.create")}</Button>
        </div>
      </div>
    </div>
  );
};

// 2. Type Signature
const TypeSignature = ({ onSave, onCancel, t }: { onSave: (dataUrl: string) => void; onCancel: () => void; t: any }) => {
  const [text, setText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleSave = () => {
    if (!text.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw text
    canvas.width = 600;
    canvas.height = 150;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Ensure font is loaded before drawing - might need a slight delay or font loader check in real prod
    ctx.font = "italic 60px 'Dancing Script', cursive"; 
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap');
      `}</style>
      <div className="p-8 border rounded-md bg-white flex items-center justify-center min-h-[150px]">
        <div style={{ fontFamily: '"Dancing Script", cursive', fontSize: '48px' }}>
          {text || <span className="text-gray-300">Your Signature</span>}
        </div>
      </div>
      <Input 
        placeholder={t("modal.placeholders.type")} 
        value={text} 
        onChange={(e) => setText(e.target.value)}
        className="text-lg"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{t("modal.buttons.cancel")}</Button>
        <Button onClick={handleSave} disabled={!text.trim()}>{t("modal.buttons.create")}</Button>
      </div>
      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

// 3. Upload Signature
const UploadSignature = ({ onSave, onCancel, t }: { onSave: (dataUrl: string) => void; onCancel: () => void; t: any }) => {
  const [image, setImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImage(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-dashed border-2 rounded-md p-8 flex flex-col items-center justify-center min-h-[200px] bg-muted/20">
        {image ? (
          <Image src={image} width={32} height={32} alt="Preview" className="max-h-[150px] object-contain" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Upload className="mx-auto h-8 w-8 mb-2" />
            <p>{t("modal.placeholders.upload")}</p>
          </div>
        )}
        <Input 
          type="file" 
          accept="image/png, image/jpeg" 
          className="hidden" 
          id="sig-upload"
          onChange={handleFileChange}
        />
        <label htmlFor="sig-upload" className="mt-4 cursor-pointer">
           <Button variant="secondary" asChild><span>{t("modal.buttons.selectFile")}</span></Button>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{t("modal.buttons.cancel")}</Button>
        <Button onClick={() => image && onSave(image)} disabled={!image}>{t("modal.buttons.create")}</Button>
      </div>
    </div>
  );
};

// 4. Page Thumbnail
const PageThumbnail = ({ pdfDoc, pageIndex }: { pdfDoc: any, pageIndex: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const renderThumbnail = async () => {
      if (!pdfDoc) return;
      
      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 0.2 }); // Small scale for thumbnail
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          setImageSrc(canvas.toDataURL());
        }
      } catch (err) {
        console.error("Error rendering thumbnail:", err);
      }
    };

    renderThumbnail();
  }, [pdfDoc, pageIndex]);

  if (!imageSrc) {
    return (
      <div className="aspect-[3/4] bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageSrc} alt={`Page ${pageIndex + 1}`} className="w-full h-full object-contain bg-white rounded" />
  );
};

// --- Main Page ---

export default function SignPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // pdfjs doc
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SignatureType>("draw");
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations("SignPage");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize PDF.js worker
  useEffect(() => {
    getPdfjs(); // Preload
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setFile(files[0]);
      setIsLoading(true);
      try {
        const pdfjs = await getPdfjs();
        if (!pdfjs) throw new Error("PDF.js not loaded");
        
        const arrayBuffer = await files[0].arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setSignatures([]);
      } catch (err) {
        console.error("Error loading PDF:", err);
        alert(t("alerts.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Render Page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        setPageSize({ width: viewport.width, height: viewport.height });
      }
    } catch (err) {
      console.error("Error rendering page:", err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Signature Handling
  const addSignature = (dataUrl: string) => {
    const newSignature: Signature = {
      id: Date.now().toString(),
      pageIndex: currentPage - 1,
      x: 50, // Default position
      y: 50,
      width: 200, // Default width
      height: 100, // Aspect ratio will be adjusted on load if possible, but fixed for now
      dataUrl
    };
    
    // Auto-adjust aspect ratio based on image
    const img = new window.Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      newSignature.height = newSignature.width / ratio;
      setSignatures(prev => [...prev, newSignature]);
    };
    img.src = dataUrl;
    
    setIsModalOpen(false);
  };

  const updateSignature = (id: string, updates: Partial<Signature>) => {
    setSignatures(prev => prev.map(sig => sig.id === id ? { ...sig, ...updates } : sig));
  };

  const removeSignature = (id: string) => {
    setSignatures(prev => prev.filter(sig => sig.id !== id));
    if (selectedSigId === id) setSelectedSigId(null);
  };

  // Drag and Resize Logic
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    isResizing: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    handle?: string;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, sig: Signature, handle?: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedSigId(sig.id);
    
    const isResizing = !!handle;
    
    setDragState({
      isDragging: !isResizing,
      isResizing,
      startX: e.clientX,
      startY: e.clientY,
      initialX: sig.x,
      initialY: sig.y,
      initialW: sig.width,
      initialH: sig.height,
      handle
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !selectedSigId) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      const sig = signatures.find(s => s.id === selectedSigId);
      if (!sig) return;

      if (dragState.isDragging) {
        updateSignature(selectedSigId, {
          x: dragState.initialX + dx,
          y: dragState.initialY + dy
        });
      } else if (dragState.isResizing) {
        // Simple resize logic (bottom-right handle for now, or unified)
        // If we want corner handles:
        let newW = dragState.initialW;
        let newH = dragState.initialH;
        let newX = dragState.initialX;
        let newY = dragState.initialY;

        // Assuming aspect ratio lock for simplicity or free resize? 
        // Let's do free resize for now, or constrained.
        
        if (dragState.handle === 'se') {
           newW = dragState.initialW + dx;
           newH = dragState.initialH + dy;
        } else if (dragState.handle === 'sw') {
           newW = dragState.initialW - dx;
           newH = dragState.initialH + dy;
           newX = dragState.initialX + dx;
        } else if (dragState.handle === 'ne') {
           newW = dragState.initialW + dx;
           newH = dragState.initialH - dy;
           newY = dragState.initialY + dy;
        } else if (dragState.handle === 'nw') {
           newW = dragState.initialW - dx;
           newH = dragState.initialH - dy;
           newX = dragState.initialX + dx;
           newY = dragState.initialY + dy;
        }

        // Min dimensions
        if (newW < 20) newW = 20;
        if (newH < 20) newH = 20;

        updateSignature(selectedSigId, { width: newW, height: newH, x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, selectedSigId, signatures]);


  // Download PDF
  const handleDownload = async () => {
    if (!file || !pdfDoc) return;
    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      for (const sig of signatures) {
        const page = pages[sig.pageIndex];
        const { width, height } = page.getSize();
        
        // Embed image
        const pngImage = await pdf.embedPng(sig.dataUrl);
        
        // Coordinate conversion
        // Browser: Top-Left (0,0). PDF: Bottom-Left (0,0).
        // Need to account for current view scale.
        // sig.x is visual pixels.
        
        // Get the viewport at scale 1.0 to know the "PDF Point" dimensions used by pdf.js default
        const pdfJsPage = await pdfDoc.getPage(sig.pageIndex + 1);
        const viewport = pdfJsPage.getViewport({ scale: 1 });
        
        // The pdf-lib page size might be different if rotation is involved, but usually matches viewport at scale 1 (72 DPI)
        // If viewport.width != width, we have a scaling issue between pdfjs and pdf-lib
        // Let's calculate the ratio.
        const scaleX = width / viewport.width;
        const scaleY = height / viewport.height;

        // Real PDF coordinates:
        // x = (sig.x / currentScale) * scaleX
        // y = height - ((sig.y / currentScale) * scaleY) - (sig.height / currentScale * scaleY)
        
        const pdfSigWidth = (sig.width / scale) * scaleX;
        const pdfSigHeight = (sig.height / scale) * scaleY;
        const pdfSigX = (sig.x / scale) * scaleX;
        const pdfSigY = height - ((sig.y / scale) * scaleY) - pdfSigHeight;

        page.drawImage(pngImage, {
          x: pdfSigX,
          y: pdfSigY,
          width: pdfSigWidth,
          height: pdfSigHeight,
        });
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error saving PDF:", err);
      alert(t("alerts.saveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col">
        
        <div className="container mx-auto py-10 max-w-4xl flex-1">
           <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
           <div className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 bg-muted/10">
             <div className="bg-primary/10 p-4 rounded-full">
               <Upload className="w-10 h-10 text-primary" />
             </div>
             <h2 className="text-xl font-semibold">{t("uploadTitle")}</h2>
             <p className="text-muted-foreground">{t("uploadDesc")}</p>
             <Button onClick={() => fileInputRef.current?.click()}>
               {t("selectPdf")}
             </Button>
             <input
               ref={fileInputRef}
               type="file"
               accept="application/pdf"
               className="hidden"
               onChange={handleFileSelect}
             />
           </div>
           <div className="mt-8 text-center text-sm text-muted-foreground">
             <p>{t("featuresDesc")}</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full bg-gray-100">
      
      {/* Editor Toolbar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setFile(null)}>
            <Undo className="w-4 h-4 mr-2" /> {t("back")}
          </Button>
          <span className="font-semibold text-sm truncate max-w-[200px]">{file.name}</span>
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
             <ZoomOut className="w-4 h-4" />
           </Button>
           <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
           <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.1))}>
             <ZoomIn className="w-4 h-4" />
           </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
             <Pen className="w-4 h-4 mr-2" /> {t("addSignature")}
          </Button>
          <Button onClick={handleDownload} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {t("downloadSigned")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 w-full flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-[256px_1fr] w-full max-w-[1200px] shadow-lg bg-white rounded-lg overflow-hidden border h-full">
         <div id="loaded-sign-pages" className="bg-white border-r overflow-y-auto hidden md:block p-4 h-full">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-500">{t("pagesTitle", { count: totalPages })}</h3>
              <div className="grid grid-cols-1 gap-4">
                 {Array.from({ length: totalPages }).map((_, idx) => (
                   <div 
                     key={idx} 
                     className={cn(
                       "border rounded p-2 cursor-pointer hover:bg-gray-50 transition",
                       currentPage === idx + 1 ? "ring-2 ring-primary" : ""
                     )}
                     onClick={() => setCurrentPage(idx + 1)}
                   >
                     <div className="aspect-[3/4] bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                        <PageThumbnail pdfDoc={pdfDoc} pageIndex={idx} />
                     </div>
                     <div className="text-center text-xs mt-1 text-gray-500">Page {idx + 1}</div>
                   </div>
                 ))}
              </div>
            </div>
         </div>

         {/* PDF Canvas Area */}
         <div id="loaded-page-canvas" className="overflow-auto bg-gray-100 flex justify-center p-8 relative h-full" onClick={() => setSelectedSigId(null)}>
            <div className="relative shadow-lg transition-all duration-200" style={{ width: pageSize ? pageSize.width : 'auto', height: pageSize ? pageSize.height : 'auto' }}>
               <canvas ref={canvasRef} className="bg-white" />
               
               {/* Signatures Overlay */}
               {signatures.filter(s => s.pageIndex === currentPage - 1).map((sig) => (
                 <div
                   key={sig.id}
                   className={cn(
                     "absolute cursor-move group select-none",
                     selectedSigId === sig.id ? "ring-2 ring-primary ring-offset-2" : ""
                   )}
                   style={{
                     left: sig.x,
                     top: sig.y,
                     width: sig.width,
                     height: sig.height,
                     zIndex: 20
                   }}
                   onMouseDown={(e) => handleMouseDown(e, sig)}
                 >
                   <Image src={sig.dataUrl} width={32} height={32} className="w-full h-full pointer-events-none" alt="signature" />
                   
                   {/* Delete Button (visible when selected) */}
                   {selectedSigId === sig.id && (
                     <button 
                       className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                       onClick={(e) => { e.stopPropagation(); removeSignature(sig.id); }}
                     >
                       <X className="w-3 h-3" />
                     </button>
                   )}

                   {/* Resize Handles (visible when selected) */}
                   {selectedSigId === sig.id && (
                     <>
                       {/* Corners */}
                       <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-nw-resize"
                            onMouseDown={(e) => handleMouseDown(e, sig, 'nw')} />
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-ne-resize"
                            onMouseDown={(e) => handleMouseDown(e, sig, 'ne')} />
                       <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-sw-resize"
                            onMouseDown={(e) => handleMouseDown(e, sig, 'sw')} />
                       <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-se-resize"
                            onMouseDown={(e) => handleMouseDown(e, sig, 'se')} />
                     </>
                   )}
                 </div>
               ))}
            </div>
          </div>
        </div>
         
         {/* Mobile Page Controls (floating) */}
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full px-4 py-2 flex items-center gap-4 md:hidden">
            <Button variant="ghost" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage(c => c - 1)}>
              Prev
            </Button>
            <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
            <Button variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)}>
              Next
            </Button>
         </div>
      </div>

      {/* Signature Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
             <div className="p-4 border-b flex items-center justify-between bg-gray-50">
               <h3 className="font-semibold text-lg">{t("modal.title")}</h3>
               <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                 <X className="w-5 h-5" />
               </Button>
             </div>
             
             <div className="flex border-b">
               <button 
                 className={cn("flex-1 py-3 text-sm font-medium", activeTab === 'draw' ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700")}
                 onClick={() => setActiveTab('draw')}
               >
                 {t("modal.tabs.draw")}
               </button>
               <button 
                 className={cn("flex-1 py-3 text-sm font-medium", activeTab === 'type' ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700")}
                 onClick={() => setActiveTab('type')}
               >
                 {t("modal.tabs.type")}
               </button>
               <button 
                 className={cn("flex-1 py-3 text-sm font-medium", activeTab === 'upload' ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700")}
                 onClick={() => setActiveTab('upload')}
               >
                 {t("modal.tabs.upload")}
               </button>
             </div>
             
             <div className="p-6">
               {activeTab === 'draw' && <SignaturePad onSave={addSignature} onCancel={() => setIsModalOpen(false)} t={t} />}
               {activeTab === 'type' && <TypeSignature onSave={addSignature} onCancel={() => setIsModalOpen(false)} t={t} />}
               {activeTab === 'upload' && <UploadSignature onSave={addSignature} onCancel={() => setIsModalOpen(false)} t={t} />}
             </div>
             
             <div className="p-4 bg-yellow-50 text-yellow-800 text-xs text-center border-t">
               {t("modal.disclaimer")}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}