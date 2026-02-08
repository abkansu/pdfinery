"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { UploadedFile } from "@/lib/types";
import { useTranslations } from "next-intl";

interface SortableFileListProps {
  files: UploadedFile[];
  onReorder: (files: UploadedFile[]) => void;
}

interface SortableItemProps {
  file: UploadedFile;
  index: number;
}

function SortableItem({ file, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });
  const t = useTranslations("Components.SortableFileList");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm mb-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-mono">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(file.timestamp).toLocaleTimeString()} • {t("pages", { count: file.pageCount })}
        </p>
      </div>
    </div>
  );
}

export function SortableFileList({ files, onReorder }: SortableFileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const t = useTranslations("Components.SortableFileList");

  const fileIds = useMemo(() => files.map((f) => f.id), [files]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((f) => f.id === active.id);
      const newIndex = files.findIndex((f) => f.id === over.id);

      onReorder(arrayMove(files, oldIndex, newIndex));
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fileIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {files.map((file, index) => (
                <SortableItem key={file.id} file={file} index={index} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}