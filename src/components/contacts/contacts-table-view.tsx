"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnResizeMode,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/schema";
import { createContactTableColumns } from "./contact-table-columns";
import { ContactTableSkeleton } from "./contact-table-skeleton";
import { ContactTableEmpty } from "./contact-table-empty";

export interface ContactsTableViewProps {
  contacts: Contact[];
  isLoading?: boolean;
  hasFilters?: boolean;
  onContactClick?: (contact: Contact) => void;
  className?: string;
}

const ROW_HEIGHT = 64;

export function ContactsTableView({
  contacts,
  isLoading = false,
  hasFilters = false,
  onContactClick,
  className,
}: ContactsTableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => {
    return createContactTableColumns({
      onContactClick,
    });
  }, [onContactClick]);

  const table = useReactTable({
    data: contacts,
    columns,
    columnResizeMode,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    // Provide initial rect to prevent flushSync during initial render (React 19 compatibility)
    initialRect: { height: 600, width: 0 },
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  if (isLoading) {
    return <ContactTableSkeleton rows={10} />;
  }

  if (contacts.length === 0) {
    return <ContactTableEmpty hasFilters={hasFilters} />;
  }

  // Calculate total width for table - use minimum of column total or ensure full width
  const totalColumnWidth = table.getCenterTotalSize();

  return (
    <div className={cn("rounded-md border overflow-hidden flex flex-col", className)}>
      <div
        ref={tableContainerRef}
        className="flex-1 min-h-0 overflow-auto"
      >
        <table
          className="border-collapse table-fixed"
          style={{ width: "100%", minWidth: totalColumnWidth }}
        >
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="relative h-12 px-4 text-left align-middle text-sm font-medium text-muted-foreground whitespace-nowrap select-none"
                    style={{ width: header.getSize(), minWidth: header.column.columnDef.minSize }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {/* Column resize handle */}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          "absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none",
                          "bg-border hover:bg-primary/50",
                          header.column.getIsResizing() && "bg-primary"
                        )}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  className={cn(
                    "group cursor-pointer transition-colors border-b",
                    "hover:bg-muted/50"
                  )}
                  onClick={() => onContactClick?.(row.original as Contact)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 align-middle overflow-hidden"
                      style={{
                        width: cell.column.getSize(),
                        minWidth: cell.column.columnDef.minSize,
                        maxWidth: cell.column.getSize()
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30 shrink-0">
        {rows.length} contact{rows.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
