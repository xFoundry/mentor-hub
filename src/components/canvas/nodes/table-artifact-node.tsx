"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { MessageSquare, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TableArtifactData } from "@/types/canvas";
import { useCanvas } from "@/contexts/canvas-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TableNodeType = Node<TableArtifactData, "tableArtifact">;

type TableEntry = {
  id: string;
  title?: string;
  rows: Array<Record<string, unknown>>;
  columns: string[];
  sourceNumber?: number;
};

type TablePayload = {
  rows?: Array<Record<string, unknown>>;
  columns?: string[];
  tables?: TableEntry[];
};

export function TableArtifactNode({ data, selected, id }: NodeProps<TableNodeType>) {
  const { updateNodeData, focusedNodeId, openChatPanel } = useCanvas();
  const payload = data?.payload as TablePayload | undefined;
  const origin = data?.origin as { tool_name?: string; query?: string; chat_block_id?: string } | undefined;
  const isFocused = focusedNodeId === id;

  const tables = useMemo<TableEntry[]>(() => {
    if (payload?.tables?.length) {
      return payload.tables.map((table, index) => ({
        id: table.id || `table_${index}`,
        title: table.title,
        rows: table.rows ?? [],
        columns: table.columns ?? [],
        sourceNumber: table.sourceNumber,
      }));
    }
    const rows = payload?.rows ?? [];
    const columns = payload?.columns ?? (rows[0] ? Object.keys(rows[0]) : []);
    return [
      {
        id: id,
        title: data?.title ?? "Data Table",
        rows,
        columns,
      },
    ];
  }, [data?.title, id, payload?.columns, payload?.rows, payload?.tables]);

  const totalRows = useMemo(
    () => tables.reduce((sum, table) => sum + table.rows.length, 0),
    [tables]
  );
  const [activeTab, setActiveTab] = useState(tables[0]?.id ?? "table");
  const isExpanded = Boolean(data?.isExpanded);
  const toolLabel = useMemo(() => {
    const tool = origin?.tool_name ?? "";
    if (!tool) return null;
    if (tool.includes("mentor_hub_tasks")) return "Tasks";
    if (tool.includes("mentor_hub_sessions")) return "Sessions";
    if (tool.includes("mentor_hub_team")) return "Team";
    if (tool.includes("mentor_hub_mentors")) return "Mentors";
    return tool.replace(/_/g, " ");
  }, [origin?.tool_name]);

  useEffect(() => {
    if (!tables.find((table) => table.id === activeTab)) {
      setActiveTab(tables[0]?.id ?? "table");
    }
  }, [activeTab, tables]);

  const setExpanded = useCallback(
    (open: boolean) => {
      updateNodeData(id, (current) => ({
        ...current,
        isExpanded: open,
      }));
    },
    [id, updateNodeData]
  );

  return (
    <>
      <div
        className={cn(
          "min-w-[240px] max-w-[320px] rounded-xl border bg-card px-4 py-3 shadow-sm transition-shadow",
          selected && "ring-2 ring-primary/40",
          isFocused && "shadow-lg ring-2 ring-primary/30"
        )}
        onDoubleClick={() => setExpanded(true)}
      >
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600">
              <Table className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                {data?.title ?? "Data Table"}
              </div>
              <div className="text-xs text-muted-foreground">
                {tables.length > 1
                  ? `${tables.length} sources · ${totalRows} rows`
                  : totalRows
                    ? `${totalRows} rows`
                    : "Structured rows"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {toolLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="cursor-default">
                    {toolLabel}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs text-xs">
                    {origin?.query ? `Query: ${origin.query}` : "Source data table"}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}
            {origin?.chat_block_id ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openChatPanel(origin.chat_block_id)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            ) : null}
            <button
              type="button"
              className="nodrag text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(true)}
            >
              View
            </button>
          </div>
        </div>
        {tables[0]?.rows?.length ? (
          <div className="mt-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
            {tables[0].columns.slice(0, 2).map((column) => (
              <div key={column} className="truncate">
                <span className="font-medium text-foreground">{column}:</span>{" "}
                {String(tables[0].rows[0]?.[column] ?? "")}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={isExpanded} onOpenChange={setExpanded}>
        <DialogContent
          className={cn(
            "!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0",
            "!w-[100vw] !h-[100svh] !max-w-[100vw] !max-h-[100svh] sm:!max-w-[100vw]",
            "!rounded-none !border-0 !p-0 !gap-0 !m-0 !flex !flex-col",
            "overflow-hidden"
          )}
        >
          <DialogHeader className="border-b px-6 py-4 shrink-0">
            <DialogTitle className="text-base font-semibold">
              {data?.title ?? "Data Table"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 min-h-0 flex-col">
            {tables.length > 1 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 min-h-0 flex-col">
                <TabsList className="mx-6 mt-4 w-fit shrink-0">
                  {tables.map((table, index) => (
                    <TabsTrigger key={table.id} value={table.id}>
                      {table.title ?? `Result ${index + 1}`}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {tables.map((table) => (
                  <TabsContent key={table.id} value={table.id} className="flex-1 min-h-0">
                    <TableOverlayContent table={table} />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <TableOverlayContent table={tables[0]} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TableOverlayContent({ table }: { table?: TableEntry }) {
  if (!table) {
    return <div className="p-6 text-sm text-muted-foreground">No data available.</div>;
  }

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filteredRows = useMemo(() => {
    if (!filter.trim()) {
      return table.rows;
    }
    const query = filter.trim().toLowerCase();
    return table.rows.filter((row) =>
      table.columns.some((column) =>
        String(row?.[column] ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [filter, table.columns, table.rows]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return filteredRows;
    }
    const sorted = [...filteredRows].sort((a, b) => {
      const aValue = String(a?.[sortKey] ?? "");
      const bValue = String(b?.[sortKey] ?? "");
      return aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: "base" });
    });
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [filteredRows, sortDirection, sortKey]);

  const handleSort = (column: string) => {
    if (sortKey === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="flex-1 min-h-0 px-6 pb-6 pt-4 overflow-hidden">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filteredRows.length} rows</span>
        {table.sourceNumber ? <span>Source #{table.sourceNumber}</span> : null}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter rows..."
          className="h-9 w-full max-w-sm"
        />
        {sortKey ? (
          <span className="text-xs text-muted-foreground">
            Sorted by {sortKey} ({sortDirection})
          </span>
        ) : null}
      </div>
      <div className="h-full overflow-auto rounded-lg border bg-background">
        {sortedRows.length ? (
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-muted/80 text-muted-foreground backdrop-blur">
              <tr>
                {table.columns.map((column) => (
                  <th key={column} className="px-3 py-2 text-left text-xs font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-left"
                      onClick={() => handleSort(column)}
                    >
                      {column}
                      {sortKey === column ? (
                        <span className="text-[10px]">{sortDirection === "asc" ? "▲" : "▼"}</span>
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, rowIndex) => (
                <Fragment key={`row-${rowIndex}`}>
                  <tr
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() =>
                      setExpandedRow((current) => (current === rowIndex ? null : rowIndex))
                    }
                  >
                    {table.columns.map((column) => (
                      <td key={`${rowIndex}-${column}`} className="px-3 py-2 align-top">
                        {row?.[column] !== undefined ? String(row[column]) : ""}
                      </td>
                    ))}
                  </tr>
                  {expandedRow === rowIndex ? (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={table.columns.length} className="px-3 py-3 text-xs text-muted-foreground">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(row, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">No rows available.</div>
        )}
      </div>
    </div>
  );
}
