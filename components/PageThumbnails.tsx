"use client";

import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateThumbnail } from "@/lib/pdfUtils";
import { cn } from "@/lib/utils";
import type { PDFPage } from "@/lib/types";
import { useTranslations } from "next-intl";

interface PageThumbnailsProps {
  pages: PDFPage[];
  selectedIndex: number;
  onSelectPage: (index: number) => void;
  onReorderPages: (pages: PDFPage[]) => void;
  onDeletePage: (index: number) => void;
  className?: string;
}

interface SortableItemProps {
  page: PDFPage;
  index: number;
  isSelected: boolean;
  thumbnail: string | null;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableItem({
  page,
  index,
  isSelected,
  thumbnail,
  onSelect,
  onDelete,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });
  const t = useTranslations("Components.PageThumbnails");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex-shrink-0",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div
        className={cn(
          "relative w-[120px] h-[160px] rounded-lg border-2 overflow-hidden transition-all cursor-pointer",
          isSelected
            ? "border-primary ring-2 ring-primary/20 shadow-lg"
            : "border-border hover:border-primary/50"
        )}
        onClick={onSelect}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={t("page", { index: index + 1 })}
            fill
            className="object-contain bg-white"
            draggable={false}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="animate-pulse text-muted-foreground text-xs">
              {t("loading")}
            </div>
          </div>
        )}
        {/* Drag handle */}
        <div
          className="absolute top-1 left-1 p-1 rounded bg-black/40 text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </div>
        {/* Page number badge */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 text-center font-medium">
          {t("page", { index: index + 1 })}
        </div>
      </div>
      {/* Delete button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

function DragOverlayItem({
  thumbnail,
  index,
}: {
  thumbnail: string | null;
  index: number;
}) {
  const t = useTranslations("Components.PageThumbnails");
  
  return (
    <div className="drag-overlay w-[120px] h-[160px] rounded-lg border-2 border-primary overflow-hidden bg-white relative shadow-2xl">
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt={t("page", { index: index + 1 })}
          fill
          className="object-contain"
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-muted-foreground text-xs">{t("loading")}</div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 text-center font-medium">
        {t("page", { index: index + 1 })}
      </div>
    </div>
  );
}

export function PageThumbnails({
  pages,
  selectedIndex,
  onSelectPage,
  onReorderPages,
  onDeletePage,
  className,
}: PageThumbnailsProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const thumbnailsRef = useRef<Record<string, string>>({});
  const t = useTranslations("Components.PageThumbnails");

  // Keep ref in sync with state
  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate thumbnails for pages that don't have them
  useEffect(() => {
    let isCancelled = false;

    const generateMissingThumbnails = async () => {
      for (const page of pages) {
        if (isCancelled) break;
        
        // Skip if already have thumbnail (use ref for current value)
        if (thumbnailsRef.current[page.id]) {
          continue;
        }
        
        try {
          const thumbnail = await generateThumbnail(page.pdfBytes);
          if (!isCancelled) {
            setThumbnails((prev) => ({ ...prev, [page.id]: thumbnail }));
          }
        } catch (error: any) {
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);

      const newPages = arrayMove(pages, oldIndex, newIndex);
      onReorderPages(newPages);

      // Update selected index if needed
      if (selectedIndex === oldIndex) {
        onSelectPage(newIndex);
      } else if (
        selectedIndex > oldIndex &&
        selectedIndex <= newIndex
      ) {
        onSelectPage(selectedIndex - 1);
      } else if (
        selectedIndex < oldIndex &&
        selectedIndex >= newIndex
      ) {
        onSelectPage(selectedIndex + 1);
      }
    }
  };

  const activeIndex = activeId
    ? pages.findIndex((p) => p.id === activeId)
    : -1;

  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[180px] text-muted-foreground">
            <p>{t("noPages")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {t("titleCount", { count: pages.length })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("dragHint")}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pages.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="flex flex-wrap gap-4 pb-4 pt-2 px-1">
              {pages.map((page, index) => (
                <SortableItem
                  key={page.id}
                  page={page}
                  index={index}
                  isSelected={index === selectedIndex}
                  thumbnail={thumbnails[page.id] || null}
                  onSelect={() => onSelectPage(index)}
                  onDelete={() => onDeletePage(index)}
                />
              ))}
            </div>
          </SortableContext>
          {typeof document !== "undefined" && createPortal(
            <DragOverlay>
              {activeId && activeIndex !== -1 ? (
                <DragOverlayItem
                  thumbnail={thumbnails[activeId] || null}
                  index={activeIndex}
                />
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </CardContent>
    </Card>
  );
}