"use client";

import { File as FileIcon } from "lucide-react";
import { PDFUploader } from "@/components/PDFUploader";
import { MainPageView } from "@/components/MainPageView";
import { PageThumbnails } from "@/components/PageThumbnails";
import { SortableFileList } from "@/components/SortableFileList";
import { usePDF } from "@/contexts/PDFContext";
import { useTranslations } from "next-intl";

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
  } = usePDF();
  
  const t = useTranslations("OrganizePage");

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
          url: "https://PDFinery.com/logos/logo.png",
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("loadingSub")}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-lg">
            {t("subtitle")}
          </p>
        </div>
        <div className="grid lg:grid-cols-[240px,1fr] gap-6 h-full items-start">
          
          {/* Left Sidebar */}
          <div className="space-y-6">
            <PDFUploader onFilesSelected={addFiles} isLoading={isLoading} />

            {/* Uploaded Files List */}
            <SortableFileList files={uploadedFiles} onReorder={setUploadedFiles} />
          </div>

          {/* Main View Area */}
          <div className="grid lg:grid-cols-[1fr,240px] gap-6 items-start">
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
                    <h3 className="text-lg font-medium mb-2">{t("noFilesTitle")}</h3>
                    <p>{t("noFilesDesc")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions Panel */}
            <div className="space-y-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
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
                    <p>{t("stats.sourceFiles")}: <span className="font-medium text-foreground">
                      {uploadedFiles.length}
                    </span></p>
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