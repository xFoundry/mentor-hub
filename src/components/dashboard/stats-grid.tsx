"use client";

import { StatsCard } from "@/components/shared/stats-card";
import type { LucideIcon } from "lucide-react";

interface Stat {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
}

interface StatsGridProps {
  stats: Stat[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({
  stats,
  isLoading = false,
  columns = 3,
}: StatsGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]}`}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          subtitle={stat.subtitle}
          icon={stat.icon}
          isLoading={isLoading}
          href={stat.href}
        />
      ))}
    </div>
  );
}
