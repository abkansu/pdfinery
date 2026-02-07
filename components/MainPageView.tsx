"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { renderPageToCanvas } from "@/lib/pdfUtils";
import type { PDFPage } from "@/lib/types";

import { cn } from "@/lib/utils";

interface MainPageViewProps {
  pages: PDFPage[];
  selectedIndex: number;
  onSelectPage: (index: number) => void;
  className?: string;
}

export function MainPageView({
  pages,
  selectedIndex,
  onSelectPage,
  className,
}: MainPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = pages[selectedIndex];

  useEffect(() => {
    if (!currentPage || !canvasRef.current) return;

    let isCancelled = false;
    let cancelRender: (() => void) | null = null;
    let renderTimeout: NodeJS.Timeout;

    const renderPage = async () => {
      setIsRendering(true);
      setError(null);
      try {
        const { promise, cancel } = await renderPageToCanvas(currentPage.pdfBytes, canvasRef.current!, 700, 900);
        cancelRender = cancel;
        await promise;
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") {
           // Ignore
           return;
        }
        console.error("Error rendering page:", err);
        if (!isCancelled) {
          setError("Failed to render page. Please try again.");
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    // Debounce the render to avoid rapid StrictMode re-renders or layout trashing
    renderTimeout = setTimeout(() => {
      renderPage();
    }, 50);

    return () => {
      isCancelled = true;
      clearTimeout(renderTimeout);
      if (cancelRender) {
        cancelRender();
      }
    };
  }, [currentPage]);

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onSelectPage(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < pages.length - 1) {
      onSelectPage(selectedIndex + 1);
    }
  };

  if (pages.length === 0) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-full min-h-[500px]">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">No pages to display</p>
            <p className="text-sm mt-1">Upload PDF files to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Page Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              {selectedIndex + 1} / {pages.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={selectedIndex === pages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {currentPage && (
          <p className="text-xs text-muted-foreground">
            From: {currentPage.sourceFileName} (Page {currentPage.pageIndex + 1})
          </p>
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-center p-4">
        <div className="relative">
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
              <div className="text-center text-destructive">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="pdf-canvas border rounded-lg shadow-sm max-h-[700px] object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
