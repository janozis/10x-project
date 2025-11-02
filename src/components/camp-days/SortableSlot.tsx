import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export interface SortableSlotProps {
  id: string;
  children: React.ReactNode;
}

export function SortableSlot({ id, children }: SortableSlotProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground" {...attributes} {...listeners} aria-label="Przeciągnij">
        <GripVertical className="size-4" />
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}


