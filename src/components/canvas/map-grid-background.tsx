"use client";

import { useId, useMemo } from "react";
import { useStore } from "@xyflow/react";
import { HEX_SIZE, HEX_WIDTH } from "@/lib/hex-grid";

function hexPath(cx: number, cy: number, size: number, width: number) {
  const halfWidth = width / 2;
  const halfSize = size / 2;
  return [
    `M ${cx} ${cy - size}`,
    `L ${cx + halfWidth} ${cy - halfSize}`,
    `L ${cx + halfWidth} ${cy + halfSize}`,
    `L ${cx} ${cy + size}`,
    `L ${cx - halfWidth} ${cy + halfSize}`,
    `L ${cx - halfWidth} ${cy - halfSize}`,
    "Z",
  ].join(" ");
}

export function MapGridBackground() {
  const rawId = useId();
  const id = useMemo(() => rawId.replace(/:/g, ""), [rawId]);
  const [translateX, translateY, zoom] = useStore((state) => state.transform);

  const size = HEX_SIZE;
  const width = HEX_WIDTH;
  const patternWidth = width * 2;
  const patternHeight = size * 3;

  const pathA = hexPath(width / 2, size, size, width);
  const pathB = hexPath(width * 1.5, size, size, width);
  const pathC = hexPath(width, size * 2.5, size, width);

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <svg className="h-full w-full" aria-hidden>
        <defs>
          <pattern
            id={id}
            width={patternWidth}
            height={patternHeight}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${translateX} ${translateY}) scale(${zoom})`}
          >
            <path
              d={pathA}
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth={1}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathB}
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth={1}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathC}
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth={1}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
