"use client";

import { useMemo } from "react";
import { useStore } from "@xyflow/react";
import { useCanvas } from "@/contexts/canvas-context";
import { axialToPixel, HEX_SIZE } from "@/lib/hex-grid";
import type { ZoneData } from "@/types/canvas";

function territoryRadius(count: number) {
  let radius = 0;
  while (1 + 3 * radius * (radius + 1) < count) {
    radius += 1;
  }
  return Math.max(1, radius + 1);
}

export function MapTerritories() {
  const { nodes, territories } = useCanvas();
  const [translateX, translateY, zoom] = useStore((state) => state.transform);

  const zonesByProject = useMemo(() => {
    const map = new Map<string, number>();
    nodes
      .filter((node) => node.type === "zone" || node.type === "chatBlock")
      .forEach((node) => {
        const data = node.data as ZoneData | undefined;
        const projectId = data?.projectId ?? "project_general";
        map.set(projectId, (map.get(projectId) ?? 0) + 1);
      });
    return map;
  }, [nodes]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {territories.map((territory) => {
          const count = zonesByProject.get(territory.id) ?? 0;
          const center = axialToPixel(territory.anchor);
          const ring = territoryRadius(count || 1);
          const size = HEX_SIZE * (ring + 0.6);
          const width = Math.sqrt(3) * size;
          const height = size * 2;
          const left = center.x - width / 2;
          const top = center.y - height / 2;
          const color = territory.color ?? "rgba(79, 70, 229, 0.2)";

          return (
            <div
              key={territory.id}
              style={{
                position: "absolute",
                left,
                top,
                width,
                height,
              }}
            >
              <svg width={width} height={height} aria-hidden>
                <polygon
                  points="50,0 100,25 100,75 50,100 0,75 0,25"
                  transform={`scale(${width / 100} ${height / 100})`}
                  fill={`${color}`}
                  fillOpacity={0.08}
                  stroke={color}
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
              </svg>
              <div
                className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm"
                style={{
                  position: "absolute",
                  top: height * 0.12,
                  left: width * 0.08,
                }}
              >
                {territory.name} · {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
