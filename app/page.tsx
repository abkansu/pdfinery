"use client";

import Image from "next/image";
import { Trash2, File as FileIcon } from "lucide-react";
import { PDFUploader } from "@/components/PDFUploader";
import { MainPageView } from "@/components/MainPageView";
import { PageThumbnails } from "@/components/PageThumbnails";
import { DownloadButton } from "@/components/DownloadButton";
import { Button } from "@/components/ui/button";
import { SortableFileList } from "@/components/SortableFileList";
import { usePDF } from "@/contexts/PDFContext";

export default function Home() {
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
    clearAll
  } = usePDF();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://PDFinery.com/#organization",
        name: "PDFinery",
        url: "https://PDFinery.com",
        logo: {
          "@type": "ImageObject",
          url: "https://PDFinery.com/logo.png",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://PDFinery.com/#application",
        name: "PDFinery",
        applicationCategory: "UtilityApplication",
        operatingSystem: "Any",
        publisher: { "@id": "https://PDFinery.com/#organization" },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Merge and reorder PDF files securely in your browser. No installation required.",
        featureList: [
          "Merge multiple PDF files",
          "Reorder pages with drag and drop",
          "Delete individual pages",
          "Preview before download",
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="PDFinery - Merge & Reorder PDF Pages"
                width={60}
                height={60}
                className="rounded-lg object-contain"
                priority
              />
              <div>
                <h1 className="text-xl font-bold">PDFinery</h1>
                <p className="text-sm text-muted-foreground">
                  Merge files and organize pages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pages.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearAll}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              )}
              <DownloadButton pages={pages} disabled={isLoading} />
            </div>
          </div>
        </div>
      </header>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait while we process your files
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="grid lg:grid-cols-[300px,1fr] gap-6 h-full items-start">
          
          {/* Left Sidebar */}
          <div className="space-y-6">
            {/* Upload Section */}
            <PDFUploader onFilesSelected={addFiles} isLoading={isLoading} />

            {/* Uploaded Files List */}
            <SortableFileList files={uploadedFiles} onReorder={setUploadedFiles} />
          </div>

          {/* Main View Area */}
          <div className="grid lg:grid-cols-[1fr,300px] gap-6 items-start">
            <div className="space-y-6">
              {pages.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {/* Page Preview */}
                  <MainPageView
                    pages={pages}
                    selectedIndex={selectedIndex}
                    onSelectPage={setSelectedIndex}
                    className="min-h-[500px]"
                  />
                  
                  {/* Thumbnails Section */}
                  <PageThumbnails
                    pages={pages}
                    selectedIndex={selectedIndex}
                    onSelectPage={setSelectedIndex}
                    onReorderPages={setPages}
                    onDeletePage={deletePage}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
                  <div className="text-center text-muted-foreground max-w-sm px-4">
                    <div className="bg-muted rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <FileIcon className="w-8 h-8 opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No files uploaded</h3>
                    <p>Upload PDF files from the left sidebar to start merging.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions Panel */}
            <div className="space-y-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">How to use</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                    <span>Upload PDF files using the panel on the left</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                    <span>Drag files in the left sidebar to reorder the entire PDF sequence</span>
                  </li>
                  <li className="flex items-start gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                    <span>Drag page thumbnails below to reorder individual pages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">4</span>
                    <span>Click "Download Merged PDF" to save your result</span>
                  </li>
                </ul>
              </div>

              {pages.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Statistics</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Total Pages: <span className="font-medium text-foreground">{pages.length}</span></p>
                    <p>Source Files: <span className="font-medium text-foreground">
                      {uploadedFiles.length}
                    </span></p>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Why Use PDFinery?</h3>
                <p className="text-sm text-muted-foreground">
                  All processing happens in your browser. Your files never leave your
                  device—no uploads to our servers, no installation, and no account
                  required. PDFinery is a free, secure PDF merger and reorder tool
                  that works on any device with a modern web browser.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Features</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Merge multiple PDF files into one document</li>
                  <li>Reorder pages with an intuitive drag-and-drop interface</li>
                  <li>Delete individual pages you don&apos;t need</li>
                  <li>Preview pages before downloading</li>
                  <li>Free to use with no file size limits</li>
                  <li>Works entirely in your browser for maximum privacy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            PDFinery - All processing happens in your browser. Your files never leave your device.
          </p>
        </div>
      </footer>
    </main>
  );
}
