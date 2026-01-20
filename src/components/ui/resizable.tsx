"use client";

import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function ResizablePanelGroup({
  className,
  ...props
}: ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({
  className,
  ...props
}: ComponentProps<typeof Panel>) {
  return (
    <Panel
      data-slot="resizable-panel"
      className={cn("", className)}
      {...props}
    />
  );
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border/50 hover:bg-border focus-visible:ring-ring relative flex w-1.5 shrink-0 items-center justify-center transition-colors focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[resize-handle-active]:bg-primary/50",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-background z-10 flex h-6 w-4 items-center justify-center rounded border shadow-sm">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
