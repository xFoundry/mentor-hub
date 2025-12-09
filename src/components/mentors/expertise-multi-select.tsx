"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

// Expertise options from Airtable schema
export const EXPERTISE_OPTIONS = [
  "Development",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "Legal",
  "Strategy",
  "Leadership",
  "Investment",
  "Manufacturing",
  "Hardware",
  "Software",
  "Analytics",
  "Research",
  "Innovation",
  "Scaling",
  "Branding",
  "Distribution",
  "Healthcare",
  "FinTech",
  "Sustainability",
  "Retail",
  "Education",
  "International",
  "Partnerships",
  "Technology",
  "AI",
  "Networking",
  "Pitching",
  "UX",
  "Fundraising",
  "Enterprise",
  "Security",
  "Media",
  "Compliance",
  "Talent",
  "Supply Chain",
  "Bootstrapping",
  "Growth",
] as const;

export type ExpertiseValue = (typeof EXPERTISE_OPTIONS)[number];

interface ExpertiseMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ExpertiseMultiSelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select expertise areas...",
}: ExpertiseMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (expertise: string) => {
    if (value.includes(expertise)) {
      onChange(value.filter((v) => v !== expertise));
    } else {
      onChange([...value, expertise]);
    }
  };

  const handleRemove = (expertise: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== expertise));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-auto min-h-10"
        >
          <div className="flex flex-wrap gap-1 py-0.5">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((expertise) => (
                <Badge
                  key={expertise}
                  variant="secondary"
                  className="mr-1"
                >
                  {expertise}
                  {!disabled && (
                    <button
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleRemove(expertise, e)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {expertise}</span>
                    </button>
                  )}
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search expertise..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No expertise found.</CommandEmpty>
            <CommandGroup>
              {EXPERTISE_OPTIONS.map((expertise) => (
                <CommandItem
                  key={expertise}
                  value={expertise}
                  onSelect={() => handleSelect(expertise)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(expertise) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {expertise}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
