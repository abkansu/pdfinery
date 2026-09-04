import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type PageMode = "single" | "facing";
type MarginSize = "small" | "medium" | "large";
type TextFormat = "number" | "page" | "pageOf";

const MIDDLE_ROW = new Set([3, 4, 5]);
const DEFAULT_POSITION = 7; // bottom-center

const MARGIN_PT: Record<MarginSize, number> = {
  small: 16,
  medium: 36,
  large: 56,
};

interface PageNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  totalPages: number;
  onApply: (newFile: File) => void;
}

function mirrorOnYAxis(placement: number): number {
  const row = Math.floor(placement / 3);
  const col = placement % 3;
  return row * 3 + (2 - col);
}

function getTextOrigin(
  placement: number,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  fontSize: number,
  margin: number
): { x: number; y: number } {
  const col = placement % 3;
  const visualRow = Math.floor(placement / 3);

  let x: number;
  if (col === 0) x = margin;
  else if (col === 1) x = (pageWidth - textWidth) / 2;
  else x = pageWidth - margin - textWidth;

  const y = visualRow === 0 ? pageHeight - margin - fontSize : margin;

  return { x, y };
}

export function PageNumberModal({ isOpen, onClose, file, totalPages, onApply }: PageNumberModalProps) {
  const t = useTranslations("EditPage");
  const [pageMode, setPageMode] = useState<PageMode>("single");
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [margin, setMargin] = useState<MarginSize>("medium");
  const [pageFrom, setPageFrom] = useState("1");
  const [pageTo, setPageTo] = useState("");
  const [textFormat, setTextFormat] = useState<TextFormat>("number");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen && totalPages > 0) {
      setPageTo((prev) => {
        const parsed = parseInt(prev, 10);
        if (!prev || Number.isNaN(parsed) || parsed > totalPages) {
          return totalPages.toString();
        }
        return prev;
      });
    }
  }, [isOpen, totalPages]);

  if (!isOpen) return null;

  const formatPageText = (pageNum: number, total: number) => {
    if (textFormat === "page") return t("pageNumbers.formatPage", { n: pageNum });
    if (textFormat === "pageOf") return t("pageNumbers.formatPageOf", { n: pageNum, total });
    return t("pageNumbers.formatNumber", { n: pageNum });
  };

  const handleApply = async () => {
    if (!file || MIDDLE_ROW.has(position)) return;
    setIsApplying(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const inset = MARGIN_PT[margin];

      const from = Math.max(1, Math.min(pages.length, parseInt(pageFrom, 10) || 1));
      const to = Math.max(from, Math.min(pages.length, parseInt(pageTo, 10) || pages.length));

      for (let i = from - 1; i < to; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const offsetInRange = i - (from - 1);
        const placement =
          pageMode === "facing" && offsetInRange % 2 === 0
            ? mirrorOnYAxis(position)
            : position;

        const pageNum = i + 1;
        const label = formatPageText(pageNum, pages.length);
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const { x, y } = getTextOrigin(placement, width, height, textWidth, fontSize, inset);

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }

      const newPdfBytes = await pdf.save();
      const newFile = new File([newPdfBytes as any], file.name, { type: "application/pdf" });
      onApply(newFile);
    } catch (err) {
      console.error(err);
      alert(t("pageNumbers.applyFailed"));
    } finally {
      setIsApplying(false);
    }
  };

  const formatOptions: { value: TextFormat; preview: string }[] = [
    { value: "number", preview: t("pageNumbers.formatNumber", { n: 1 }) },
    { value: "page", preview: t("pageNumbers.formatPage", { n: 1 }) },
    { value: "pageOf", preview: t("pageNumbers.formatPageOf", { n: 1, total: totalPages || 1 }) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{t("pageNumbers.title")}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isApplying}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">{t("pageNumbers.pageMode")}</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "single" as const, title: t("pageNumbers.single"), desc: t("pageNumbers.singleDesc") },
                { value: "facing" as const, title: t("pageNumbers.facing"), desc: t("pageNumbers.facingDesc") },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPageMode(option.value)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-colors",
                    pageMode === option.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className="text-sm font-medium">{option.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t("pageNumbers.position")}</label>
            <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
              {Array.from({ length: 9 }).map((_, i) => {
                const disabled = MIDDLE_ROW.has(i);
                const selected = position === i;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPosition(i)}
                    className={cn(
                      "aspect-square border rounded transition-colors flex items-center justify-center text-xs",
                      disabled && "bg-muted/60 cursor-not-allowed opacity-50",
                      !disabled && selected && "bg-primary text-primary-foreground border-primary",
                      !disabled && !selected && "bg-white hover:bg-gray-100 cursor-pointer"
                    )}
                    aria-label={t("pageNumbers.position")}
                  >
                    {selected && !disabled ? "✓" : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t("pageNumbers.margin")}</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "small" as const, label: t("pageNumbers.marginSmall") },
                { value: "medium" as const, label: t("pageNumbers.marginMedium") },
                { value: "large" as const, label: t("pageNumbers.marginLarge") },
              ]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMargin(option.value)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    margin === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              {t("pageNumbers.pages")} (1 – {totalPages})
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">{t("pageNumbers.from")}</span>
                <Input
                  type="number"
                  value={pageFrom}
                  onChange={(e) => setPageFrom(e.target.value)}
                  min={1}
                  max={totalPages}
                  className="mt-1"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t("pageNumbers.to")}</span>
                <Input
                  type="number"
                  value={pageTo}
                  onChange={(e) => setPageTo(e.target.value)}
                  min={1}
                  max={totalPages}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t("pageNumbers.text")}</label>
            <div className="space-y-2">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTextFormat(option.value)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-sm text-left transition-colors",
                    textFormat === option.value
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-input hover:bg-muted"
                  )}
                >
                  {option.preview}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            {t("pageNumbers.cancel")}
          </Button>
          <Button onClick={handleApply} disabled={isApplying || MIDDLE_ROW.has(position)}>
            {isApplying ? t("pageNumbers.applying") : t("pageNumbers.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
