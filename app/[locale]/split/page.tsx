"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { File as FileIcon, Scissors, Download, CheckCircle2 } from "lucide-react";
import JSZip from "jszip";
import { PDFUploader } from "@/components/PDFUploader";
import { PageThumbnails } from "@/components/PageThumbnails"; // unused but imported? keeping consistent
import { SortableFileList } from "@/components/SortableFileList";
import { usePDF } from "@/contexts/PDFContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mergePDFs, downloadPDF, generateThumbnail } from "@/lib/pdfUtils";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type SplitMode = "ranges" | "every-n" | "single" | "extract";

export default function SplitPage() {
  const {
    pages,
    uploadedFiles,
    selectedIndex,
    isLoading,
    loadingMessage,
    addFiles,
    setPages,
    setUploadedFiles,
    setSelectedIndex,
    deletePage,
  } = usePDF();
  
  const t = useTranslations("SplitPage");

  const [splitMode, setSplitMode] = useState<SplitMode>("ranges");
  const [rangeInput, setRangeInput] = useState("");
  const [everyNPage, setEveryNPage] = useState("1");
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const thumbnailsRef = useRef<Record<string, string>>({});

  // Keep ref in sync
  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  // Generate thumbnails
  useEffect(() => {
    let isCancelled = false;

    const generateMissingThumbnails = async () => {
      for (const page of pages) {
        if (isCancelled) break;
        
        // Skip if already have thumbnail (check ref)
        if (thumbnailsRef.current[page.id] || page.thumbnail) {
          continue;
        }
        
        try {
          const thumbnail = await generateThumbnail(page.pdfBytes);
          if (!isCancelled) {
            setThumbnails((prev) => ({ ...prev, [page.id]: thumbnail }));
          }
        } catch (error) {
          console.error("Error generating thumbnail for page:", page.id, error);
        }
      }
    };

    if (pages.length > 0) {
      generateMissingThumbnails();
    }

    return () => {
      isCancelled = true;
    };
  }, [pages]);


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PDFinery Split Tool",
    description: "Split PDF files by range, extract pages, or split into single pages securely in your browser.",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Split PDF by page ranges",
      "Split PDF every N pages",
      "Extract specific pages from PDF",
      "Split PDF into single pages"
    ],
  };

  // Parse range string "1-5, 8-10" into array of arrays of indices (0-based)
  const parseRanges = (input: string, maxPage: number): number[][] => {
    const ranges: number[][] = [];
    const parts = input.split(",").map(p => p.trim()).filter(p => p);

    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(n => parseInt(n));
        if (!isNaN(start) && !isNaN(end)) {
          const range: number[] = [];
          // Adjust to 0-based index and clamp
          const s = Math.max(0, Math.min(start - 1, maxPage - 1));
          const e = Math.max(0, Math.min(end - 1, maxPage - 1));
          for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
            range.push(i);
          }
          if (range.length > 0) ranges.push(range);
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page)) {
          const p = Math.max(0, Math.min(page - 1, maxPage - 1));
          ranges.push([p]);
        }
      }
    }
    return ranges;
  };

  const handleSplit = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      if (splitMode === "extract") {
        // Just one file with selected pages
        const pagesToExtract = pages.filter((_, i) => selectedPages.has(i));
        if (pagesToExtract.length === 0) {
          alert(t("alerts.selectPages"));
          setIsProcessing(false);
          return;
        }
        const mergedBytes = await mergePDFs(pagesToExtract);
        downloadPDF(mergedBytes, "extracted-pages.pdf");
      } else {
        // Multiple files, zip them
        const zip = new JSZip();
        let fileCount = 0;

        if (splitMode === "single") {
          // One file per page
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pdfBytes = await mergePDFs([page]); // Create valid PDF from single page
            zip.file(`page-${i + 1}.pdf`, pdfBytes);
            fileCount++;
          }
        } else if (splitMode === "every-n") {
          const n = parseInt(everyNPage);
          if (isNaN(n) || n < 1) {
            alert(t("alerts.invalidNumber"));
            setIsProcessing(false);
            return;
          }
          
          for (let i = 0; i < pages.length; i += n) {
            const chunk = pages.slice(i, i + n);
            const pdfBytes = await mergePDFs(chunk);
            zip.file(`split-${Math.floor(i / n) + 1}.pdf`, pdfBytes);
            fileCount++;
          }
        } else if (splitMode === "ranges") {
          const ranges = parseRanges(rangeInput, pages.length);
          if (ranges.length === 0) {
            alert(t("alerts.invalidRanges"));
            setIsProcessing(false);
            return;
          }

          for (let i = 0; i < ranges.length; i++) {
            const rangeIndices = ranges[i];
            const rangePages = rangeIndices.map(idx => pages[idx]);
            const pdfBytes = await mergePDFs(rangePages);
            zip.file(`range-${i + 1}.pdf`, pdfBytes);
            fileCount++;
          }
        }

        if (fileCount > 0) {
          const content = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          const link = document.createElement("a");
          link.href = url;
          link.download = "split-files.zip";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert(t("alerts.error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (index: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPages(newSelected);
    setSelectedIndex(index); // Also update preview
  };

  useEffect(() => {
    // Use useEffect to update React state instead of modifying imported pages directly
    // This is safer and cleaner than relying on page.thumbnail
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">{loadingMessage}</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="grid lg:grid-cols-[240px,1fr] gap-6 h-full items-start">
          
          <div className="space-y-6">
            <PDFUploader onFilesSelected={addFiles} isLoading={isLoading} />
            <SortableFileList files={uploadedFiles} onReorder={setUploadedFiles} />
          </div>

          <div className="grid lg:grid-cols-[1fr,240px] gap-6 items-start">
            <div className="space-y-6">
              {pages.length > 0 ? (
                <div className="flex flex-col gap-6">
                  <div className="bg-card rounded-lg p-6 shadow-sm border">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                      <Scissors className="w-6 h-6" />
                      {t("title")}
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div 
                        className={cn(
                          "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors",
                          splitMode === "ranges" ? "bg-muted/50 border-primary" : "hover:bg-muted/50"
                        )}
                        onClick={() => setSplitMode("ranges")}
                      >
                        <input 
                          type="radio" 
                          id="ranges" 
                          checked={splitMode === "ranges"} 
                          onChange={() => setSplitMode("ranges")}
                          className="h-4 w-4"
                        />
                        <label htmlFor="ranges" className="cursor-pointer flex-1">
                          <div className="font-medium">{t("modes.ranges")}</div>
                          <div className="text-xs text-muted-foreground">{t("modes.rangesDesc")}</div>
                        </label>
                      </div>
                      
                      <div 
                        className={cn(
                          "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors",
                          splitMode === "every-n" ? "bg-muted/50 border-primary" : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSplitMode("every-n");
                          setSelectedPages(new Set());
                        }}
                      >
                        <input 
                          type="radio" 
                          id="every-n" 
                          checked={splitMode === "every-n"} 
                          onChange={() => {
                            setSplitMode("every-n");
                            setSelectedPages(new Set());
                          }}
                          className="h-4 w-4"
                        />
                        <label htmlFor="every-n" className="cursor-pointer flex-1">
                          <div className="font-medium">{t("modes.everyN")}</div>
                          <div className="text-xs text-muted-foreground">{t("modes.everyNDesc")}</div>
                        </label>
                      </div>

                      <div 
                        className={cn(
                          "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors",
                          splitMode === "single" ? "bg-muted/50 border-primary" : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSplitMode("single");
                          setSelectedPages(new Set());
                        }}
                      >
                        <input 
                          type="radio" 
                          id="single" 
                          checked={splitMode === "single"} 
                          onChange={() => {
                            setSplitMode("single");
                            setSelectedPages(new Set());
                          }}
                          className="h-4 w-4"
                        />
                        <label htmlFor="single" className="cursor-pointer flex-1">
                          <div className="font-medium">{t("modes.single")}</div>
                          <div className="text-xs text-muted-foreground">{t("modes.singleDesc")}</div>
                        </label>
                      </div>

                      <div 
                        className={cn(
                          "flex items-center space-x-2 border rounded-lg p-4 cursor-pointer transition-colors",
                          splitMode === "extract" ? "bg-muted/50 border-primary" : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSplitMode("extract");
                          // Do not reset selection here to preserve user choice
                        }}
                      >
                        <input 
                          type="radio" 
                          id="extract" 
                          checked={splitMode === "extract"} 
                          onChange={() => setSplitMode("extract")}
                          className="h-4 w-4"
                        />
                        <label htmlFor="extract" className="cursor-pointer flex-1">
                          <div className="font-medium">{t("modes.extract")}</div>
                          <div className="text-xs text-muted-foreground">{t("modes.extractDesc")}</div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      {splitMode === "ranges" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("inputs.rangesLabel")}</label>
                          <Input 
                            placeholder={t("inputs.rangesPlaceholder")} 
                            value={rangeInput}
                            onChange={(e) => setRangeInput(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t("inputs.rangesHelp")}
                          </p>
                        </div>
                      )}

                      {splitMode === "every-n" && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t("inputs.everyNLabel")}</label>
                          <Input 
                            type="number" 
                            min="1" 
                            value={everyNPage}
                            onChange={(e) => setEveryNPage(e.target.value)}
                          />
                        </div>
                      )}

                      {splitMode === "extract" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {t("inputs.extractLabel", { count: selectedPages.size })}
                          </p>
                        </div>
                      )}

                      {splitMode === "single" && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {t("inputs.singleLabel", { count: pages.length })}
                          </p>
                        </div>
                      )}

                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleSplit}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          t("buttons.processing")
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            {splitMode === "extract" ? t("buttons.downloadSelected") : t("buttons.downloadZip")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Thumbnails Section with Selection Support */}
                  <div className={cn(
                    "grid gap-4",
                    splitMode === "extract" ? "cursor-pointer" : ""
                  )}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {pages.map((page, index) => (
                        <div
                          key={page.id}
                          className={cn(
                            "relative group rounded-lg border-2 overflow-hidden transition-all hover:shadow-md",
                            splitMode === "extract" && selectedPages.has(index) 
                              ? "border-primary ring-2 ring-primary ring-offset-2" 
                              : "border-transparent hover:border-muted-foreground/25",
                            selectedIndex === index && splitMode !== "extract" ? "border-primary" : "bg-card"
                          )}
                          onClick={() => {
                            if (splitMode === "extract") {
                              togglePageSelection(index);
                            } else {
                              setSelectedIndex(index);
                            }
                          }}
                        >
                          <div className="aspect-[3/4] relative bg-white">
                            {thumbnails[page.id] || page.thumbnail ? (
                              <Image
                                src={thumbnails[page.id] || page.thumbnail || ""}
                                alt={`Page ${index + 1}`}
                                className="w-full h-full object-contain"
                                width={180}
                                height={240}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <div className="animate-pulse bg-muted w-full h-full" />
                              </div>
                            )}
                            
                            {splitMode === "extract" && selectedPages.has(index) && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}

                            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs py-1 px-2 text-center backdrop-blur-sm">
                              Page {index + 1}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                  <div className="text-center text-muted-foreground max-w-sm px-4">
                    <div className="bg-muted rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <FileIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">{t("noFiles.title")}</h3>
                    <p>{t("noFiles.desc")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 sticky top-24">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">{t("howTo.title")}</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                    <span>{t("howTo.step1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                    <span>{t("howTo.step2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                    <span>{t("howTo.step3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                    <span>{t("howTo.step4")}</span>
                  </li>
                </ul>
              </div>

              {pages.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">{t("stats.title")}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{t("stats.totalPages")}: <span className="font-medium text-foreground">{pages.length}</span></p>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">{t("features.title")}</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>{t("features.list.0")}</li>
                  <li>{t("features.list.1")}</li>
                  <li>{t("features.list.2")}</li>
                  <li>{t("features.list.3")}</li>
                  <li>{t("features.list.4")}</li>
                  <li>{t("features.list.5")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}