"use client";

import { useState, useRef } from "react";
import { 
  FileText, 
  Settings2, 
  Download, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PDFUploader } from "@/components/PDFUploader";
import { useTranslations } from "next-intl";
import { formatBytes, cn } from "@/lib/utils";
import { optimizePDF, OptimizeOptions } from "@/lib/optimizeUtils";

export default function OptimizePage() {
  const t = useTranslations("OptimizePage");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<OptimizeOptions>({
    compressionLevel: "medium",
    imageQuality: 0.7,
    removeMetadata: true,
    flatten: false,
    convertToGrayscale: false,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  };

  const handleFilesSelected = (files: FileList) => {
    if (files.length === 0) return;
    setFile(files[0]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const handleOptimize = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const optimizedBytes = await optimizePDF(file, settings, (p) => setProgress(p));
      const blob = new Blob([new Uint8Array(optimizedBytes)], { type: "application/pdf" });
      setResult({ blob, size: blob.size });
    } catch (err) {
      console.error(err);
      setError(t("error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || !file) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${t("downloadFilenamePrefix")}-${file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateCompressionLevel = (level: "low" | "medium" | "high" | "condense" | "custom") => {
    const newSettings = { ...settings, compressionLevel: level };
    
    if (level === "low") {
      newSettings.imageQuality = 1.0;
      newSettings.removeMetadata = true;
      newSettings.flatten = true;
    } else if (level === "medium") {
      newSettings.imageQuality = 0.7;
      newSettings.removeMetadata = true;
      newSettings.flatten = false; 
    } else if (level === "high") {
      newSettings.imageQuality = 0.5;
      newSettings.removeMetadata = true;
      newSettings.flatten = false;
    } else if (level === "condense") {
      newSettings.imageQuality = 1.0; // Lossless
      newSettings.removeMetadata = true;
      newSettings.flatten = false;
    }
    
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {!file ? (
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
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-[350px,1fr] gap-8">
              
              {/* Settings Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      {t("uploadTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      <p className="font-medium truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full text-xs h-8" 
                      onClick={() => { setFile(null); setResult(null); }}
                      disabled={isProcessing}
                    >
                      {t("selectPdf")}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings2 className="h-5 w-5" />
                      {t("settings.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Compression Level */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {t("settings.compressionLevel")}
                      </label>
                      <div className="grid gap-2">
                        {(["low", "medium", "high", "condense", "custom"] as const).map((level) => (
                          <div key={level} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={level}
                              name="compressionLevel"
                              value={level}
                              checked={settings.compressionLevel === level}
                              onChange={(e) => updateCompressionLevel(e.target.value as any)}
                              disabled={isProcessing}
                              className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <label
                              htmlFor={level}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t(`settings.levels.${level}` as any)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom Settings */}
                    {settings.compressionLevel === "custom" && (
                      <div className="space-y-4 pt-4 border-t animate-in slide-in-from-top-2">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {t("settings.imageQuality")}
                                </label>
                                <span className="text-xs text-muted-foreground">{Math.round(settings.imageQuality * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                step="5"
                                value={settings.imageQuality * 100}
                                onChange={(e) => setSettings({...settings, imageQuality: Number(e.target.value) / 100})}
                                disabled={isProcessing}
                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="flatten"
                                checked={settings.flatten}
                                onCheckedChange={(checked) => setSettings({ ...settings, flatten: checked === true })}
                                disabled={isProcessing}
                            />
                            <label htmlFor="flatten" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none">
                                {t("settings.flatten")}
                            </label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="metadata"
                                checked={settings.removeMetadata}
                                onCheckedChange={(checked) => setSettings({ ...settings, removeMetadata: checked === true })}
                                disabled={isProcessing}
                            />
                            <label htmlFor="metadata" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none">
                                {t("settings.removeMetadata")}
                            </label>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      className="w-full mt-4" 
                      size="lg"
                      onClick={handleOptimize}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("buttons.optimizing", { progress })}
                        </>
                      ) : (
                        <>
                          <Minimize2 className="mr-2 h-4 w-4" />
                          {t("buttons.optimize")}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content / Results */}
              <div className="space-y-6">
                {!result ? (
                   <div className="h-full min-h-[400px] border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/10">
                    <div className="text-center p-6 space-y-4">
                      <div className="bg-primary/10 p-4 rounded-full inline-block">
                        <Minimize2 className="h-12 w-12 text-primary" />
                      </div>
                      <p className="text-lg font-medium">{t("emptyState.title")}</p>
                      <p className="text-sm max-w-sm mx-auto">
                        {t("emptyState.hint")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
                      <CardContent className="p-8 text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full">
                                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">
                                {t("results.success")}
                            </h3>
                            <div className="text-lg space-y-1">
                                <p>{t("results.original")} <span className="font-semibold">{formatBytes(file.size)}</span></p>
                                <p>{t("results.optimized")} <span className="font-semibold">{formatBytes(result.size)}</span></p>
                                <p className="text-green-600 font-bold">
                                    {t("results.savedPercent", { percent: Math.round(((file.size - result.size) / file.size) * 100) })}
                                </p>
                            </div>
                        </div>

                        <Button size="lg" className="w-full max-w-md gap-2" onClick={handleDownload}>
                            <Download className="h-5 w-5" />
                            {t("buttons.download")}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {error && (
                  <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex gap-3 items-center animate-in fade-in">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="font-medium">{error}</p>
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
