"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ContactTableSkeletonProps {
  rows?: number;
  className?: string;
}

export function ContactTableSkeleton({ rows = 10, className }: ContactTableSkeletonProps) {
  return (
    <div className={cn("rounded-md border overflow-hidden flex flex-col", className)}>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="border-collapse table-fixed w-full">
          {/* Header */}
          <thead className="sticky top-0 z-10 bg-muted/95">
            <tr className="border-b">
              <th className="h-12 px-4 text-left" style={{ width: "30%" }}>
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="h-12 px-4 text-left" style={{ width: "12%" }}>
                <Skeleton className="h-4 w-12" />
              </th>
              <th className="h-12 px-4 text-left" style={{ width: "15%" }}>
                <Skeleton className="h-4 w-14" />
              </th>
              <th className="h-12 px-4 text-left" style={{ width: "20%" }}>
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="h-12 px-4 text-left" style={{ width: "12%" }}>
                <Skeleton className="h-4 w-14" />
              </th>
              <th className="h-12 px-4 text-left" style={{ width: "11%" }}>
                <Skeleton className="h-4 w-12" />
              </th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="border-b">
                {/* Contact (Avatar + Name + Email) */}
                <td className="px-4 py-3" style={{ width: "30%" }}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3" style={{ width: "12%" }}>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>

                {/* Phone */}
                <td className="px-4 py-3" style={{ width: "15%" }}>
                  <Skeleton className="h-4 w-24" />
                </td>

                {/* Expertise */}
                <td className="px-4 py-3" style={{ width: "20%" }}>
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3" style={{ width: "12%" }}>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </td>

                {/* Links */}
                <td className="px-4 py-3" style={{ width: "11%" }}>
                  <div className="flex gap-1">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer to match table */}
      <div className="border-t px-4 py-2 bg-muted/30 shrink-0">
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
