import { getChangelogEntries } from "@/lib/changelog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Circle, Inbox } from "lucide-react";
import { format, isAfter, subDays } from "date-fns";

// Parse date as local date (not UTC) to avoid timezone shifts
// gray-matter may return Date objects or strings depending on frontmatter format
function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) {
    // Already a Date object - extract local date parts to avoid UTC shift
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  // String format: "YYYY-MM-DD"
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isRecent(date: string | Date): boolean {
  return isAfter(parseLocalDate(date), subDays(new Date(), 7));
}

export default function ChangelogPage() {
  const entries = getChangelogEntries();

  return (
    <div className="container max-w-2xl py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">What&apos;s New</h1>
            <p className="text-sm text-muted-foreground">
              The latest updates and improvements
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No updates yet</p>
          <p className="text-sm text-muted-foreground/70">
            Check back soon for new features and improvements
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

          {/* Entries */}
          <div className="space-y-10">
            {entries.map((entry, entryIndex) => {
              const recent = isRecent(entry.date);

              return (
                <div key={entry.slug} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1.5">
                    <Circle
                      className={`h-[14px] w-[14px] ${
                        entryIndex === 0
                          ? "fill-primary text-primary"
                          : "fill-background text-border"
                      }`}
                      strokeWidth={2}
                    />
                  </div>

                  {/* Date and badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <time
                      dateTime={entry.date instanceof Date ? entry.date.toISOString() : entry.date}
                      className="text-sm font-medium text-muted-foreground"
                    >
                      {format(parseLocalDate(entry.date), "MMMM d, yyyy")}
                    </time>
                    {recent && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        New
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold mb-4">{entry.title}</h2>

                  {/* Content items */}
                  <div className="space-y-4">
                    {entry.content.split("\n\n").map((block, index) => {
                      const lines = block.split("\n");
                      const heading = lines[0];
                      const description = lines.slice(1).join(" ");

                      if (!heading.trim()) return null;

                      return (
                        <div
                          key={index}
                          className="group rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                        >
                          <h3 className="font-medium text-sm">{heading}</h3>
                          {description && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                              {description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
