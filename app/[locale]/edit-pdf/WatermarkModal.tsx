import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { cn } from "@/lib/utils";

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  totalPages: number;
  onApply: (newFile: File) => void;
}

export function WatermarkModal({ isOpen, onClose, file, totalPages, onApply }: WatermarkModalProps) {
  const [wmType, setWmType] = useState<"text" | "image">("text");
  const [wmText, setWmText] = useState("");
  const [wmImage, setWmImage] = useState<string | null>(null);
  const [wmPlacements, setWmPlacements] = useState<number[]>([4]);
  const [wmOpacity, setWmOpacity] = useState("0.5");
  const [wmRotation, setWmRotation] = useState("0");
  const [wmPageFrom, setWmPageFrom] = useState("1");
  const [wmPageTo, setWmPageTo] = useState("");
  const [wmLayer, setWmLayer] = useState<"above" | "below">("above");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (totalPages > 0 && !wmPageTo) {
      setWmPageTo(totalPages.toString());
    }
  }, [totalPages, wmPageTo]);

  if (!isOpen) return null;

  const togglePlacement = (index: number) => {
    setWmPlacements(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleApply = async () => {
    if (!file) return;
    setIsApplying(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();

      let imageBytes: Uint8Array | undefined;
      let pdfImage: any;
      if (wmType === "image" && wmImage) {
        const res = await fetch(wmImage);
        imageBytes = new Uint8Array(await res.arrayBuffer());
        if (wmImage.startsWith("data:image/png")) {
          pdfImage = await pdf.embedPng(imageBytes);
        } else {
          pdfImage = await pdf.embedJpg(imageBytes);
        }
      }

      let font: any;
      if (wmType === "text" && wmText) {
        font = await pdf.embedFont(StandardFonts.Helvetica);
      }

      const from = Math.max(1, parseInt(wmPageFrom) || 1);
      const to = Math.min(pages.length, parseInt(wmPageTo) || pages.length);
      const opacity = parseFloat(wmOpacity) || 1;
      const rotationDeg = parseFloat(wmRotation) || 0;
      const theta = rotationDeg * Math.PI / 180;

      for (let i = from - 1; i < to; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const cellWidth = width / 3;
        const cellHeight = height / 3;

        let targetPage = page;
        let embeddedPage: any;

        if (wmLayer === "below") {
            const [copiedPage] = await pdf.copyPages(pdf, [i]);
            embeddedPage = await pdf.embedPage(copiedPage);
            targetPage = pdf.insertPage(i, [width, height]);
            pdf.removePage(i + 1);
            pages[i] = targetPage;
        }

        wmPlacements.forEach(placement => {
            const row = 2 - Math.floor(placement / 3); 
            const col = placement % 3;
            const centerX = col * cellWidth + cellWidth / 2;
            const centerY = row * cellHeight + cellHeight / 2;

            if (wmType === "text" && wmText && font) {
              const textSize = 48;
              const textWidth = font.widthOfTextAtSize(wmText, textSize);
              const textHeight = font.heightAtSize(textSize);

              const x = centerX - ((textWidth/2)*Math.cos(theta) - (textHeight/2)*Math.sin(theta));
              const y = centerY - ((textWidth/2)*Math.sin(theta) + (textHeight/2)*Math.cos(theta));

              targetPage.drawText(wmText, {
                x,
                y,
                size: textSize,
                font,
                color: rgb(0, 0, 0),
                opacity,
                rotate: degrees(rotationDeg),
              });
            } else if (wmType === "image" && pdfImage) {
              const scale = Math.min(cellWidth / pdfImage.width, cellHeight / pdfImage.height) * 0.8;
              const imgW = pdfImage.width * scale;
              const imgH = pdfImage.height * scale;

              const x = centerX - ((imgW/2)*Math.cos(theta) - (imgH/2)*Math.sin(theta));
              const y = centerY - ((imgW/2)*Math.sin(theta) + (imgH/2)*Math.cos(theta));

              targetPage.drawImage(pdfImage, {
                x,
                y,
                width: imgW,
                height: imgH,
                opacity,
                rotate: degrees(rotationDeg),
              });
            }
        });

        if (wmLayer === "below" && embeddedPage) {
            targetPage.drawPage(embeddedPage);
        }
      }

      const newPdfBytes = await pdf.save();
      const newFile = new File([newPdfBytes as any], file.name, { type: "application/pdf" });
      
      onApply(newFile);

    } catch (err) {
      console.error(err);
      alert("Failed to apply watermark.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Watermark</h3>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isApplying}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Type Selection */}
          <div className="flex gap-4 border-b pb-2">
            <button 
              className={cn("px-4 py-2 font-medium border-b-2", wmType === "text" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
              onClick={() => setWmType("text")}
            >
              Text
            </button>
            <button 
              className={cn("px-4 py-2 font-medium border-b-2", wmType === "image" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
              onClick={() => setWmType("image")}
            >
              Image
            </button>
          </div>

          {/* Content */}
          {wmType === "text" ? (
            <div>
              <label className="text-sm font-medium">Watermark Text</label>
              <Input 
                value={wmText}
                onChange={(e) => setWmText(e.target.value)}
                placeholder="Enter text..."
                className="mt-1"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Upload Image</label>
              <Input 
                type="file" 
                accept="image/*"
                className="mt-1"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      setWmImage(evt.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {wmImage && <div className="mt-2 text-sm text-green-600">Image selected</div>}
            </div>
          )}

          {/* Placement Grid */}
          <div>
            <label className="text-sm font-medium mb-1 block">Placement</label>
            <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
              {Array.from({ length: 9 }).map((_, i) => (
                <div 
                  key={i}
                  onClick={() => togglePlacement(i)}
                  className={cn(
                    "aspect-square border rounded cursor-pointer transition-colors flex items-center justify-center",
                    wmPlacements.includes(i) ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-white hover:bg-gray-100"
                  )}
                >
                  {wmPlacements.includes(i) && <span className="text-xs">✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Transparency */}
            <div>
              <label className="text-sm font-medium mb-1 block">Transparency</label>
              <Select value={wmOpacity} onValueChange={setWmOpacity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transparency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">None</SelectItem>
                  <SelectItem value="0.75">25%</SelectItem>
                  <SelectItem value="0.5">50%</SelectItem>
                  <SelectItem value="0.25">75%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-sm font-medium mb-1 block">Rotation</label>
              <Select value={wmRotation} onValueChange={setWmRotation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rotation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  <SelectItem value="45">45°</SelectItem>
                  <SelectItem value="90">90°</SelectItem>
                  <SelectItem value="180">180°</SelectItem>
                  <SelectItem value="270">270°</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Layer and Pages */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Layer</label>
              <Select value={wmLayer} onValueChange={(val: any) => setWmLayer(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above Content</SelectItem>
                  <SelectItem value="below">Below Content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Pages (1 to {totalPages})</label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={wmPageFrom} 
                  onChange={(e) => setWmPageFrom(e.target.value)} 
                  min={1} 
                  max={totalPages}
                  className="w-full"
                />
                <span>-</span>
                <Input 
                  type="number" 
                  value={wmPageTo} 
                  onChange={(e) => setWmPageTo(e.target.value)} 
                  min={1} 
                  max={totalPages}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>Cancel</Button>
          <Button 
            onClick={handleApply} 
            disabled={isApplying || (wmType === "text" && !wmText) || (wmType === "image" && !wmImage) || wmPlacements.length === 0}
          >
            {isApplying ? "Applying..." : "Apply Watermark"}
          </Button>
        </div>
      </div>
    </div>
  );
}
