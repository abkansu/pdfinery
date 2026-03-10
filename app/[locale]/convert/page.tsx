"use client";

import { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Loader2, 
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PDFUploader } from "@/components/PDFUploader";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  loadPdf, 
  renderPageAsImage, 
  extractTextFromPdf, 
  createZip, 
  formatBytes,
  ConversionResult,
  imageToPdf,
  textToPdf
} from "@/lib/conversionUtils";
import { useTranslations } from "next-intl";

type ConversionType = "image" | "text" | "docx" | "xlsx" | "pdfa";
type ImageFormat = "image/png" | "image/jpeg";

interface ImageConversionState {
  scale: number;
  format: ImageFormat;
  results: ConversionResult[];
}

function BlobImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return <div className="w-full h-full animate-pulse bg-muted" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={url} 
      alt={alt}
      className="w-full h-full object-contain p-2"
    />
  );
}

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(true);
  const [pdfInfo, setPdfInfo] = useState<{ numPages: number } | null>(null);
  const [activeTab, setActiveTab] = useState<ConversionType>("image");
  const t = useTranslations("ConvertPage");
  
  // State for Image Conversion
  const [imageSettings, setImageSettings] = useState<{ scale: number; format: ImageFormat }>({
    scale: 1.5,
    format: "image/png"
  });
  const [imageResults, setImageResults] = useState<ConversionResult[]>([]);
  
  // State for Text Conversion
  const [textResult, setTextResult] = useState<string | null>(null);
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  // Load PDF info when file changes
  const handleFilesSelected = async (files: FileList) => {
    if (files.length === 0) return;
    const selectedFile = files[0];
    
    // Reset states
    setFile(selectedFile);
    setImageResults([]);
    setTextResult(null);
    setError(null);
    setProgress(0);
    setPdfInfo(null);
    
    const isPdfFile = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
    setIsPdf(isPdfFile);

    if (isPdfFile) {
      try {
        const pdf = await loadPdf(selectedFile);
        setPdfInfo({ numPages: pdf.numPages });
        pdf.destroy();
      } catch (err) {
        console.error(err);
        setError(t("errors.loadFailed"));
        setFile(null);
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    try {
      if (!isPdf) {
        // TO PDF Workflow
        if (file.type.startsWith("image/")) {
          const blob = await imageToPdf(file);
          downloadFile(blob, `${file.name.replace(/\.[^/.]+$/, "")}.pdf`);
        } else if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          const blob = await textToPdf(file);
          downloadFile(blob, `${file.name.replace(/\.[^/.]+$/, "")}.pdf`);
        } else {
          // Office or HTML
          const form = new FormData();
          form.append("file", file);
          const res = await fetch(`${BACKEND_URL}/convert/to-pdf`, {
            method: "POST",
            body: form,
          });
          if (!res.ok) throw new Error(t("errors.serverError"));
          const blob = await res.blob();
          downloadFile(blob, `${file.name.replace(/\.[^/.]+$/, "")}.pdf`);
        }
      } else {
        // FROM PDF Workflow
        if (activeTab === "image") {
          if (!pdfInfo) return;
          const pdf = await loadPdf(file);
          const results: ConversionResult[] = [];
          const ext = imageSettings.format === "image/png" ? "png" : "jpg";
          
          for (let i = 1; i <= pdfInfo.numPages; i++) {
            const blob = await renderPageAsImage(
              pdf, 
              i, 
              imageSettings.scale, 
              imageSettings.format
            );
            
            results.push({
              blob,
              name: `${file.name.replace(".pdf", "")}-page-${i}.${ext}`
            });
            
            setProgress(Math.round((i / pdfInfo.numPages) * 100));
          }
          setImageResults(results);
          pdf.destroy();
        } else if (activeTab === "text") {
          if (!pdfInfo) return;
          const pdf = await loadPdf(file);
          const text = await extractTextFromPdf(pdf, (current, total) => {
            setProgress(Math.round((current / total) * 100));
          });
          setTextResult(text);
          pdf.destroy();
        } else {
          // Backend conversions for docx, xlsx, pdfa
          const form = new FormData();
          form.append("file", file);
          
          let endpoint = "";
          if (activeTab === "docx") endpoint = "/convert/pdf-to-docx";
          else if (activeTab === "xlsx") endpoint = "/convert/pdf-to-xlsx";
          else if (activeTab === "pdfa") endpoint = "/convert/pdf-to-pdfa";

          const res = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: "POST",
            body: form,
          });
          
          if (!res.ok) throw new Error(t("errors.serverError"));
          
          const blob = await res.blob();
          let ext = activeTab === "pdfa" ? "pdf" : activeTab;
          downloadFile(blob, `${file.name.replace(".pdf", "")}_converted.${ext}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError(t("errors.conversionFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllImages = async () => {
    if (imageResults.length === 0) return;
    
    if (imageResults.length === 1) {
      downloadFile(imageResults[0].blob, imageResults[0].name);
      return;
    }

    try {
      const zipBlob = await createZip(imageResults);
      downloadFile(zipBlob, `${file?.name.replace(".pdf", "")}-images.zip`);
    } catch (err) {
      console.error("Failed to zip images", err);
      alert(t("errors.zipFailed"));
    }
  };

  const handleDownloadText = () => {
    if (!textResult || !file) return;
    const blob = new Blob([textResult], { type: "text/plain" });
    downloadFile(blob, `${file.name.replace(".pdf", "")}.txt`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Main Upload / File Info Area */}
          {!file ? (
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="text-center space-y-2 mb-8">
                  <h1 className="text-3xl font-bold">{t("title")}</h1>
                  <p className="text-muted-foreground text-lg">
                    {t("subtitle")}
                  </p>
                </div>
                <PDFUploader 
                  onFilesSelected={handleFilesSelected} 
                  isLoading={false}
                  accept=".pdf,.docx,.xlsx,.pptx,.html,.txt,.md,image/*"
                  allowedExtensions={[".pdf", ".docx", ".xlsx", ".pptx", ".html", ".txt", ".md", "image/*"]}
                  dropTextKey="dropTextGeneric"
                  buttonTextKey="buttonGeneric"
                />
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
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-[300px,1fr] gap-8">
              
              {/* Sidebar - Settings */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isPdf 
                            ? t("fileInfo", { size: formatBytes(file.size), pages: pdfInfo?.numPages || "?" })
                            : t("fileInfoGeneric", { size: formatBytes(file.size) })
                          }
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full text-xs h-8" 
                      onClick={() => setFile(null)}
                      disabled={isProcessing}
                    >
                      {t("changeFile")}
                    </Button>
                  </CardContent>
                </Card>

                {isPdf ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-muted-foreground px-1">{t("modes.label")}</p>
                      <Select value={activeTab} onValueChange={(val: any) => setActiveTab(val)} disabled={isProcessing}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("modes.label")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">{t("modes.image")}</SelectItem>
                          <SelectItem value="text">{t("modes.text")}</SelectItem>
                          <SelectItem value="docx">{t("modes.docx")}</SelectItem>
                          <SelectItem value="xlsx">{t("modes.xlsx")}</SelectItem>
                          <SelectItem value="pdfa">{t("modes.pdfa")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {activeTab === "image" && (
                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t("imageSettings.format")}</label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant={imageSettings.format === "image/png" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setImageSettings(s => ({ ...s, format: "image/png" }))}
                                disabled={isProcessing}
                              >
                                PNG
                              </Button>
                              <Button
                                variant={imageSettings.format === "image/jpeg" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setImageSettings(s => ({ ...s, format: "image/jpeg" }))}
                                disabled={isProcessing}
                              >
                                JPG
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">{t("imageSettings.scale")}</label>
                            <select 
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                              value={imageSettings.scale}
                              onChange={(e) => setImageSettings(s => ({ ...s, scale: Number(e.target.value) }))}
                              disabled={isProcessing}
                            >
                              <option value="1">{t("imageSettings.scaleOptions.scale_1")}</option>
                              <option value="1.5">{t("imageSettings.scaleOptions.scale_1_5")}</option>
                              <option value="2">{t("imageSettings.scaleOptions.scale_2")}</option>
                              <option value="3">{t("imageSettings.scaleOptions.scale_3")}</option>
                            </select>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-center">
                    {t("toPdfHelp")}
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleConvert}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("buttons.converting", { progress })}
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      {!isPdf ? t("buttons.convertToPdf") : (
                        activeTab === "image" ? t("buttons.convertImage") : 
                        activeTab === "text" ? t("buttons.convertText") : 
                        t("buttons.convertFile")
                      )}
                    </>
                  )}
                </Button>
                
                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
              </div>

              {/* Main Content - Results */}
              <div className="space-y-6">
                {/* Initial State / Placeholder */}
                {!isProcessing && imageResults.length === 0 && !textResult && !error && (
                  <div className="h-full min-h-[400px] border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/10">
                    <div className="text-center p-6">
                      <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>{isPdf && (activeTab === "docx" || activeTab === "xlsx" || activeTab === "pdfa") || !isPdf ? t("results.readyToDownload") : t("results.placeholder")}</p>
                    </div>
                  </div>
                )}

                {/* Text Results */}
                {textResult && activeTab === "text" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <CheckCircle2 className="text-green-500 h-5 w-5" />
                        {t("results.complete")}
                      </h3>
                      <Button onClick={handleDownloadText} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        {t("buttons.downloadTxt")}
                      </Button>
                    </div>
                    <Card className="max-h-[600px] overflow-auto">
                      <CardContent className="p-4">
                        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                          {textResult}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Image Results */}
                {imageResults.length > 0 && activeTab === "image" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <CheckCircle2 className="text-green-500 h-5 w-5" />
                        {t("results.convertedCount", { count: imageResults.length })}
                      </h3>
                      <Button onClick={handleDownloadAllImages} variant="default" className="gap-2">
                        <Download className="h-4 w-4" />
                        {imageResults.length > 1 ? t("buttons.downloadZip") : t("buttons.downloadAll")}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {imageResults.map((result, idx) => (
                        <div key={idx} className="group relative border rounded-lg overflow-hidden bg-background shadow-sm hover:shadow-md transition-all">
                          <div className="aspect-[1/1.4] bg-muted relative">
                            <BlobImage blob={result.blob} alt={result.name} />
                          </div>
                          <div className="p-3 flex items-center justify-between bg-card border-t">
                            <span className="text-xs font-medium truncate max-w-[120px]">Page {idx + 1}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => downloadFile(result.blob, result.name)}
                              title={t("tooltips.downloadPage")}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
