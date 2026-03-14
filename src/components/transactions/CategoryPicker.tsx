import { useState, useMemo, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { useCategoryTree, useCreateCategory } from "@/hooks/useCategories";
import { useHousehold } from "@/hooks/useHousehold";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import type { Tables } from "@/types/database";

interface CategoryPickerProps {
  value: string | null;
  category: Tables<"categories"> | null;
  onSelect: (categoryId: string | null) => void;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  placeholder?: string;
}

export function CategoryPicker({
  value,
  category,
  onSelect,
  triggerClassName,
  align = "start",
  placeholder = "Uncategorized",
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const tree = useCategoryTree();
  const createCategory = useCreateCategory();
  const { currentHouseholdId } = useHousehold();

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  type FilteredNode = { parent: Tables<"categories">; children: Tables<"categories">[]; forceOpen?: boolean };

  const filteredTree: FilteredNode[] = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    return tree
      .map(({ parent, children }): FilteredNode | null => {
        const parentMatch = parent.name.toLowerCase().includes(q);
        const matchingChildren = children.filter((c) =>
          c.name.toLowerCase().includes(q)
        );
        if (parentMatch || matchingChildren.length > 0) {
          return {
            parent,
            children: parentMatch ? children : matchingChildren,
            forceOpen: !parentMatch && matchingChildren.length > 0,
          };
        }
        return null;
      })
      .filter((n): n is FilteredNode => n !== null);
  }, [tree, search]);

  function handleSelect(id: string | null) {
    onSelect(id);
    setOpen(false);
    setSearch("");
  }

  async function handleCreate() {
    if (!newName.trim() || !currentHouseholdId) return;
    try {
      const colorIdx = tree.length % CATEGORY_COLORS.length;
      const created = await createCategory.mutateAsync({
        household_id: currentHouseholdId,
        name: newName.trim(),
        color: CATEGORY_COLORS[colorIdx],
        is_system: false,
      });
      toast.success(`Created "${newName.trim()}"`);
      setNewName("");
      setCreating(false);
      handleSelect(created.id);
    } catch {
      toast.error("Failed to create category");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 text-xs rounded px-2 py-1 hover:bg-muted transition-colors text-left",
            triggerClassName
          )}
        >
          {category ? (
            <>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: category.color ?? "#94a3b8" }}
              />
              <span className="truncate">{category.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align={align}>
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
              autoFocus
            />
          </div>
        </div>

        {/* Category list */}
        <div className="max-h-64 overflow-y-auto p-1">
          {/* Uncategorized option */}
          <button
            className={cn(
              "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-1.5",
              !value && "bg-accent"
            )}
            onClick={() => handleSelect(null)}
          >
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-muted-foreground">Uncategorized</span>
          </button>

          {filteredTree.map(({ parent, children, forceOpen }) => {
            const isExpanded = forceOpen || expanded.has(parent.id) || search.trim().length > 0;
            const hasChildren = children.length > 0;

            return (
              <div key={parent.id}>
                <div className="flex items-center">
                  {hasChildren ? (
                    <button
                      className="p-0.5 rounded hover:bg-accent shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(parent.id);
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 text-muted-foreground transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>
                  ) : (
                    <div className="w-4" />
                  )}
                  <button
                    className={cn(
                      "flex-1 text-left px-1.5 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-1.5 font-medium",
                      value === parent.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(parent.id)}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: parent.color ?? "#94a3b8" }}
                    />
                    {parent.name}
                  </button>
                </div>

                {isExpanded &&
                  children.map((child) => (
                    <button
                      key={child.id}
                      className={cn(
                        "w-full text-left pl-8 pr-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-1.5 text-muted-foreground",
                        value === child.id && "bg-accent text-foreground"
                      )}
                      onClick={() => handleSelect(child.id)}
                    >
                      {child.name}
                    </button>
                  ))}
              </div>
            );
          })}

          {filteredTree.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              No categories found
            </p>
          )}
        </div>

        {/* Create custom category */}
        <div className="border-t p-2">
          {creating ? (
            <div className="flex items-center gap-1">
              <Input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-7 text-xs flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-1.5 text-muted-foreground"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create custom category
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
