"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ApiCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function CategoryPicker({
  categories,
  value,
  onSelect,
  placeholder = "Category",
  allowClear = false,
  trigger,
  className,
}: {
  categories: ApiCategory[];
  /* selected category id, null for uncategorized */
  value: string | null;
  onSelect: (categoryId: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = categories.filter((category) => !category.isArchived);
  const selected = categories.find((category) => category.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between font-normal", className)}
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected?.name ?? placeholder}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Find a category…" />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {allowClear ? (
                <CommandItem
                  value="__uncategorized"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn(value === null ? "opacity-100" : "opacity-0")} />
                  Uncategorized
                </CommandItem>
              ) : null}
              {active.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    onSelect(category.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn(value === category.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex items-center gap-2">
                    <CategoryIcon size="sm" icon={category.icon} name={category.name} color={category.color} />
                    {category.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
