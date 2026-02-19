"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Upload, Type, Pen, X, Download, Undo, 
  ZoomIn, ZoomOut, MousePointer2, Image as ImageIcon,
  Square, Eraser, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfjs } from "@/lib/pdfUtils";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import * as fabric from "fabric";

// --- Types ---
type Tool = "select" | "text" | "freehand" | "rect" | "whiteout";

interface PageEdits {
  [pageIndex: number]: any; // Fabric JSON representation
}

export default function EditPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // pdfjs doc
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [pageEdits, setPageEdits] = useState<PageEdits>({});
  
  const t = useTranslations("EditPage");

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasInstance = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF Helper
  const loadPdf = async (arrayBuffer: ArrayBuffer, fileObj: File) => {
    try {
      const pdfjs = await getPdfjs();
      if (!pdfjs) throw new Error("PDF.js not loaded");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setFile(fileObj);
      setPageEdits({});
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      console.error("Error loading PDF:", err);
      alert(t("alerts.loadFailed"));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setIsLoading(true);
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        await loadPdf(arrayBuffer, selectedFile);
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
  };

  // Render Page & Initialize Fabric
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current || !fabricCanvasRef.current) return;

    try {
      // 1. Render PDF background
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        setPageSize({ width: viewport.width, height: viewport.height });

        // 2. Initialize or Update Fabric Canvas
        if (!fabricCanvasInstance.current) {
          fabricCanvasInstance.current = new fabric.Canvas(fabricCanvasRef.current, {
            width: viewport.width,
            height: viewport.height,
            isDrawingMode: activeTool === "freehand",
          });
        } else {
          const fCanvas = fabricCanvasInstance.current;
          fCanvas.setDimensions({ width: viewport.width, height: viewport.height });
          fCanvas.clear();
        }

        // 3. Load saved edits for this page
        const savedData = pageEdits[currentPage];
        if (savedData) {
          await fabricCanvasInstance.current.loadFromJSON(savedData);
          fabricCanvasInstance.current.renderAll();
        }
      }
    } catch (err) {
      console.error("Error rendering page:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale, pageEdits]); // Note: excluding activeTool from deps intentionally

  // Save current page state when leaving
  const saveCurrentPageState = () => {
    if (fabricCanvasInstance.current) {
      const json = fabricCanvasInstance.current.toJSON();
      setPageEdits(prev => ({ ...prev, [currentPage]: json }));
    }
  };

  useEffect(() => {
    saveCurrentPageState(); // Save before changing page/scale
    renderPage();
    return () => {
       // Optional: We don't save on unmount of page
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, scale, pdfDoc]); // Only trigger on page, scale, or doc change

  // Handle Tool Changes
  useEffect(() => {
    const canvas = fabricCanvasInstance.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === "freehand";
    if (activeTool === "freehand") {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = "red";
      canvas.freeDrawingBrush.width = 3 * scale;
    }

    // Unselect objects if switching tools
    if (activeTool !== "select") {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }, [activeTool, scale]);

  // Canvas Interactions
  useEffect(() => {
    const canvas = fabricCanvasInstance.current;
    if (!canvas) return;

    const handleMouseDown = (opt: any) => {
      if (activeTool === "select" || activeTool === "freehand") return;

      const pointer = canvas.getScenePoint(opt.e);
      
      if (activeTool === "text") {
        const text = new fabric.IText("Type here", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 24 * scale,
          fill: "black",
          fontFamily: "Helvetica",
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setActiveTool("select");
      } 
      else if (activeTool === "rect" || activeTool === "whiteout") {
        const isWhiteout = activeTool === "whiteout";
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 100 * scale,
          height: 50 * scale,
          fill: isWhiteout ? "white" : "transparent",
          stroke: isWhiteout ? "white" : "red",
          strokeWidth: isWhiteout ? 0 : 2 * scale,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        setActiveTool("select");
      }
    };

    canvas.on("mouse:down", handleMouseDown);
    return () => {
      canvas.off("mouse:down", handleMouseDown);
    };
  }, [activeTool, scale]);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0] && fabricCanvasInstance.current) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const imgObj = new Image();
        imgObj.src = evt.target?.result as string;
        imgObj.onload = () => {
           const fImage = new fabric.Image(imgObj);
           fImage.scaleToWidth(200 * scale);
           fabricCanvasInstance.current?.add(fImage);
           fabricCanvasInstance.current?.centerObject(fImage);
           fabricCanvasInstance.current?.setActiveObject(fImage);
           fabricCanvasInstance.current?.requestRenderAll();
           setActiveTool("select");
        };
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasInstance.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Prevent deleting if currently typing in an IText
        const canvas = fabricCanvasInstance.current;
        if (canvas) {
          const activeObj = canvas.getActiveObject() as any;
          if (activeObj && activeObj.isEditing) return;
        }
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

  // Export Edits
  const handleDownload = async () => {
    if (!file || !pdfDoc) return;
    setIsLoading(true);
    
    // Save current page state first
    saveCurrentPageState();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      // We might need an off-screen canvas to convert some objects
      // For simplicity, we can render the Fabric canvas for each page to a dataURL 
      // and overlay it on the PDF page. It's much safer than trying to translate all coordinates and styles.
      
      for (let i = 1; i <= totalPages; i++) {
        const pageData = i === currentPage && fabricCanvasInstance.current 
          ? fabricCanvasInstance.current.toJSON() 
          : pageEdits[i];
          
        if (pageData && pageData.objects && pageData.objects.length > 0) {
          // Off-screen fabric to render the image
          const pdfJsPage = await pdfDoc.getPage(i);
          // Render at scale 2 for better quality export
          const exportScale = 2.0;
          const viewport = pdfJsPage.getViewport({ scale: exportScale });
          
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          
          const fCanvas = new fabric.Canvas(offscreenCanvas, {
            width: viewport.width,
            height: viewport.height
          });
          
          // Adjust objects for export scale
          const scaleMultiplier = exportScale / scale;
          const adjustedData = {
            ...pageData,
            objects: pageData.objects.map((obj: any) => ({
              ...obj,
              left: obj.left * scaleMultiplier,
              top: obj.top * scaleMultiplier,
              scaleX: (obj.scaleX || 1) * scaleMultiplier,
              scaleY: (obj.scaleY || 1) * scaleMultiplier,
            }))
          };
          
          await fCanvas.loadFromJSON(adjustedData);
          fCanvas.renderAll();
          
          const dataUrl = fCanvas.toDataURL({ format: "png", multiplier: 1 });
          const pngImage = await pdf.embedPng(dataUrl);
          
          const page = pages[i - 1];
          const { width, height } = page.getSize();
          
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: width,
            height: height,
          });
        }
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${file.name}`;
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
    );
  }

  return (
      <div className="flex flex-col h-full min-h-[calc(100vh-10rem)] w-full bg-gray-50 border rounded-lg overflow-hidden shadow-sm">
        
        {/* Editor Toolbar */}
        <div className="bg-white border-b px-4 py-3 flex flex-wrap items-center justify-between shadow-sm z-10 gap-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              <Undo className="w-4 h-4 mr-2" /> {t("back")}
            </Button>
            <span className="font-semibold text-sm truncate max-w-[150px] md:max-w-[200px]">{file.name}</span>
          </div>
          
          {/* Editing Tools */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
             <Button 
               variant={activeTool === "select" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("select")}
               title="Select"
             >
               <MousePointer2 className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "text" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("text")}
               title={t("tools.text")}
             >
               <Type className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "freehand" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("freehand")}
               title={t("tools.freehand")}
             >
               <Pen className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "rect" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("rect")}
               title={t("tools.rectangle")}
             >
               <Square className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "whiteout" ? "secondary" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("whiteout")}
               title={t("tools.whiteout")}
             >
               <Eraser className="w-4 h-4" />
             </Button>
             
             <div className="w-px h-6 bg-border mx-1" />
             
             <Button 
               variant="ghost" 
               size="sm"
               onClick={() => document.getElementById('image-upload')?.click()}
               title={t("tools.image")}
             >
               <ImageIcon className="w-4 h-4" />
               <input 
                 id="image-upload" 
                 type="file" 
                 accept="image/*" 
                 className="hidden" 
                 onChange={handleImageUpload} 
               />
             </Button>
             <Button 
               variant="ghost" 
               size="sm"
               onClick={() => {
                 if (fabricCanvasInstance.current) {
                    fabricCanvasInstance.current.clear();
                 }
               }}
               title={t("tools.clear")}
             >
               <X className="w-4 h-4" />
             </Button>
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 mr-2">
               <Button variant="outline" size="sm" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                 <ZoomOut className="w-3 h-3" />
               </Button>
               <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
               <Button variant="outline" size="sm" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
                 <ZoomIn className="w-3 h-3" />
               </Button>
             </div>
             
             <Button size="sm" onClick={handleDownload} disabled={isLoading}>
               {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
               {t("downloadEdited")}
             </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex w-full h-[600px] lg:h-[800px]">
          {/* Thumbnails Sidebar */}
          <div className="w-48 bg-white border-r overflow-y-auto hidden md:block p-4">
             <div className="space-y-4">
               <h3 className="font-semibold text-xs text-muted-foreground">{t("pagesTitle", { count: totalPages })}</h3>
               <div className="grid grid-cols-1 gap-3">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "border rounded overflow-hidden cursor-pointer hover:bg-muted transition",
                        currentPage === idx + 1 ? "ring-2 ring-primary border-transparent" : "border-border"
                      )}
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      <div className="bg-gray-100 flex items-center justify-center aspect-[3/4] p-2 text-xs text-muted-foreground relative">
                         {/* Simple placeholder, full thumbnail rendering could be added */}
                         Sayfa {idx + 1}
                         {pageEdits[idx + 1] && Object.keys(pageEdits[idx + 1].objects || {}).length > 0 && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" title="Edited" />
                         )}
                      </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto bg-gray-100/50 flex justify-center p-4 relative" id="pdf-viewer-container">
             <div 
               className="relative shadow-xl transition-all duration-200 bg-white" 
               style={{ 
                 width: pageSize ? pageSize.width : 'auto', 
                 height: pageSize ? pageSize.height : 'auto' 
               }}
             >
                <canvas ref={pdfCanvasRef} className="absolute inset-0" />
                <canvas ref={fabricCanvasRef} className="absolute inset-0" />
             </div>
          </div>
        </div>

        {/* Mobile Page Controls */}
        <div className="bg-white border-t px-4 py-2 flex items-center justify-between md:hidden">
           <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(c => c - 1)}>
             Önceki
           </Button>
           <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
           <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)}>
             Sonraki
           </Button>
        </div>
      </div>
  );
}
