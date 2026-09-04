"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Upload, Type, Pen, X, Download, Undo, 
  ZoomIn, ZoomOut, MousePointer2, Image as ImageIcon,
  Square, Eraser, Loader2, Stamp, Hash, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfjs } from "@/lib/pdfUtils";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import * as fabric from "fabric";
import { WatermarkModal } from "./WatermarkModal";
import { PageNumberModal } from "./PageNumberModal";

// --- Types ---
type Tool = "select" | "text" | "freehand" | "rect" | "whiteout";

interface PageEdits {
  [pageIndex: number]: any; // Fabric JSON representation
}

// 1. Page Thumbnail Component
const PageThumbnail = ({ pdfDoc, pageIndex }: { pdfDoc: any, pageIndex: number }) => {
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

export default function EditPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // pdfjs doc
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [pageEdits, setPageEdits] = useState<PageEdits>({});
  
  // Watermark Modal State
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showPageNumberModal, setShowPageNumberModal] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  const t = useTranslations("EditPage");

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasInstance = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF Helper
  const loadPdf = async (arrayBuffer: ArrayBuffer, fileObj: File, preserveEdits = false) => {
    try {
      const pdfjs = await getPdfjs();
      if (!pdfjs) throw new Error("PDF.js not loaded");

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      if (!preserveEdits) {
        setCurrentPage(1);
        setPageEdits({});
        if (fabricCanvasInstance.current) {
          fabricCanvasInstance.current.dispose();
          fabricCanvasInstance.current = null;
        }
      }
      setFile(fileObj);
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
      setOriginalFile(selectedFile);
      setIsLoading(true);
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        await loadPdf(arrayBuffer, selectedFile);
      } catch (err) {
        console.error(err);
        setIsLoading(false);
      }
    }
    // Clear the input value so the same file can be selected again later
    e.target.value = '';
  };

  // Clear All Edits
  const clearAllEdits = async () => {
    if (!originalFile) return;
    setIsLoading(true);
    setPageEdits({});
    setActiveTool("select");
    if (fabricCanvasInstance.current) {
      fabricCanvasInstance.current.clear();
    }
    try {
      const arrayBuffer = await originalFile.arrayBuffer();
      await loadPdf(arrayBuffer, originalFile, false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
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

  useEffect(() => {
    renderPage();
    return () => {
      // Save the state of the outgoing page before switching to the new one
      if (fabricCanvasInstance.current) {
        const json = fabricCanvasInstance.current.toJSON();
        setPageEdits(prev => ({ ...prev, [currentPage]: json }));
      }
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
    // Clear the input value so the same file can be uploaded again
    e.target.value = '';
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
    if (fabricCanvasInstance.current) {
      const json = fabricCanvasInstance.current.toJSON();
      setPageEdits(prev => ({ ...prev, [currentPage]: json }));
    }

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
        <div className="container mx-auto py-10 max-w-5xl flex-1">
           <div className="space-y-12">
             <div className="space-y-4">
               <div className="text-center space-y-2 mb-8">
                 <h1 className="text-3xl font-bold">{t("title")}</h1>
                 <p className="text-muted-foreground text-lg">
                   {t("subtitle")}
                 </p>
               </div>
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
             </div>
             <div className="grid md:grid-cols-2 gap-8">
               <div className="bg-muted/50 rounded-lg p-8">
                 <h3 className="font-medium text-lg mb-4">{t("howTo.title")}</h3>
                 <ul className="text-sm text-muted-foreground space-y-3">
                   <li className="flex items-start gap-3">
                     <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                     <span>{t("howTo.step1")}</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                     <span>{t("howTo.step2")}</span>
                   </li>
                   <li className="flex items-start gap-3">
                       <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                     <span>{t("howTo.step3")}</span>
                   </li>
                   <li className="flex items-start gap-3">
                     <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                     <span>{t("howTo.step4")}</span>
                   </li>
                 </ul>
               </div>
               <div className="bg-muted/50 rounded-lg p-8">
                 <h3 className="font-medium text-lg mb-4">{t("features.title")}</h3>
                 <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                   <li>{t("features.list.0")}</li>
                   <li>{t("features.list.1")}</li>
                   <li>{t("features.list.2")}</li>
                   <li>{t("features.list.3")}</li>
                   <li>{t("features.list.4")}</li>
                   <li>{t("features.list.5")}</li>
                   <li>{t("features.list.6")}</li>
                   <li>{t("features.list.7")}</li>
                 </ul>
               </div>
             </div>
           </div>
        </div>
    );
  }

  return (
      <div className="flex flex-col h-[calc(100vh-10rem)] w-full bg-gray-100">
        
        {/* Editor Toolbar */}
        <div className="bg-white border-b px-6 py-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center shadow-sm z-10 gap-3 min-w-0">
          <div className="flex items-center gap-4 min-w-0 overflow-hidden">
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => {
              if (fabricCanvasInstance.current) {
                fabricCanvasInstance.current.dispose();
                fabricCanvasInstance.current = null;
              }
              setFile(null);
            }}>
              <Undo className="w-4 h-4 mr-2" /> {t("back")}
            </Button>
            <span className="font-semibold text-sm truncate min-w-0" title={file.name}>{file.name}</span>
          </div>
          
          {/* Editing Tools */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md shrink-0">
             <Button 
               variant={activeTool === "select" ? "default" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("select")}
               title="Select"
             >
               <MousePointer2 className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "text" ? "default" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("text")}
               title={t("tools.text")}
             >
               <Type className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "freehand" ? "default" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("freehand")}
               title={t("tools.freehand")}
             >
               <Pen className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "rect" ? "default" : "ghost"} 
               size="sm"
               onClick={() => setActiveTool("rect")}
               title={t("tools.rectangle")}
             >
               <Square className="w-4 h-4" />
             </Button>
             <Button 
               variant={activeTool === "whiteout" ? "default" : "ghost"} 
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
               onClick={() => setShowWatermarkModal(true)}
               title={t("tools.watermark")}
             >
               <Stamp className="w-4 h-4" />
             </Button>

             <Button 
               variant="ghost" 
               size="sm"
               onClick={() => setShowPageNumberModal(true)}
               title={t("tools.pageNumbers")}
             >
               <Hash className="w-4 h-4" />
             </Button>

             <Button 
               variant="ghost" 
               size="sm"
               onClick={clearAllEdits}
               title={t("tools.clear")}
             >
               <X className="w-4 h-4" />
             </Button>
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1">
               <Button variant="outline" size="sm" className="shrink-0" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                 <ZoomOut className="w-3 h-3" />
               </Button>
               <span className="text-xs w-10 text-center shrink-0">{Math.round(scale * 100)}%</span>
               <Button variant="outline" size="sm" className="shrink-0" onClick={() => setScale(s => Math.min(3, s + 0.2))}>
                 <ZoomIn className="w-3 h-3" />
               </Button>
             </div>
             
             <Button size="sm" className="shrink-0" onClick={handleDownload} disabled={isLoading}>
               {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
               {t("downloadEdited")}
             </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden p-6 w-full flex justify-center">
          <div className={cn(
            "grid grid-cols-1 w-full max-w-[1200px] shadow-lg bg-white rounded-lg overflow-hidden border h-full",
            isPreviewOpen ? "md:grid-cols-[256px_1fr]" : "md:grid-cols-[48px_1fr]"
          )}>
            <div
              id="loaded-edit-pages"
              className={cn(
                "bg-white border-r hidden md:block h-full",
                isPreviewOpen ? "overflow-y-auto p-4" : "overflow-hidden p-1"
              )}
            >
              {!isPreviewOpen && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 bg-black text-white hover:bg-neutral-800 hover:text-white [&_svg]:size-4"
                    onClick={() => setIsPreviewOpen(true)}
                    title={t("showPreview")}
                    aria-label={t("showPreview")}
                  >
                    <PanelLeftOpen />
                  </Button>
                </div>
              )}
              <div className={cn("space-y-4", !isPreviewOpen && "hidden")}>
                <div className="flex items-center justify-between gap-1">
                  <h3 className="font-semibold text-sm text-gray-500">{t("pagesTitle", { count: totalPages })}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 bg-black text-white hover:bg-neutral-800 hover:text-white [&_svg]:size-4"
                    onClick={() => setIsPreviewOpen(false)}
                    title={t("hidePreview")}
                    aria-label={t("hidePreview")}
                  >
                    <PanelLeftClose />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "border rounded p-2 cursor-pointer hover:bg-gray-50 transition relative",
                        currentPage === idx + 1 ? "ring-2 ring-primary" : ""
                      )}
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      <div className="aspect-[3/4] bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 overflow-hidden relative">
                         <PageThumbnail pdfDoc={pdfDoc} pageIndex={idx} />
                      </div>
                      <div className="text-center text-xs mt-1 text-gray-500">Page {idx + 1}</div>
                      {pageEdits[idx + 1] && Object.keys(pageEdits[idx + 1].objects || {}).length > 0 && (
                         <div className="absolute top-3 right-3 w-3 h-3 bg-primary rounded-full shadow-sm" title="Edited" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="overflow-auto bg-gray-100 flex justify-center p-8 relative h-full" id="pdf-viewer-container">
               <div 
                 className="relative shadow-lg transition-all duration-200 bg-white" 
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

        {/* Watermark Modal */}
        <WatermarkModal
          isOpen={showWatermarkModal}
          onClose={() => setShowWatermarkModal(false)}
          file={file}
          totalPages={totalPages}
          onApply={async (newFile) => {
            if (fabricCanvasInstance.current) {
              const json = fabricCanvasInstance.current.toJSON();
              setPageEdits(prev => ({ ...prev, [currentPage]: json }));
            }
            setShowWatermarkModal(false);
            setIsLoading(true);
            try {
              await loadPdf(await newFile.arrayBuffer(), newFile, true);
            } catch (err) {
              console.error(err);
              setIsLoading(false);
            }
          }}
        />

        <PageNumberModal
          isOpen={showPageNumberModal}
          onClose={() => setShowPageNumberModal(false)}
          file={file}
          totalPages={totalPages}
          onApply={async (newFile) => {
            if (fabricCanvasInstance.current) {
              const json = fabricCanvasInstance.current.toJSON();
              setPageEdits(prev => ({ ...prev, [currentPage]: json }));
            }
            setShowPageNumberModal(false);
            setIsLoading(true);
            try {
              await loadPdf(await newFile.arrayBuffer(), newFile, true);
            } catch (err) {
              console.error(err);
              setIsLoading(false);
            }
          }}
        />
      </div>
  );
}
