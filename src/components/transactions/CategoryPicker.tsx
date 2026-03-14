import { useState, useMemo, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronRight, Plus, Search, Check, X } from "lucide-react";
import { useCategoryTree, useCreateCategory } from "@/hooks/useCategories";
import { useHousehold } from "@/hooks/useHousehold";
import { CategoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
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
  // Track which parent we're adding a subcategory to
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");

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

  // Resolve icon for a category — falls back to parent icon for subcategories
  const resolveIcon = useCallback((cat: Tables<"categories"> | null) => {
    if (!cat) return null;
    if (cat.icon) return cat.icon;
    // Find parent icon
    if (cat.parent_id) {
      const parentNode = tree.find((n) => n.parent.id === cat.parent_id);
      return parentNode?.parent.icon ?? null;
    }
    return null;
  }, [tree]);

  function handleSelect(id: string | null) {
    onSelect(id);
    setOpen(false);
    setSearch("");
    setAddingTo(null);
    setNewSubName("");
  }

  async function handleCreateSub(parentId: string, parentColor: string | null) {
    if (!newSubName.trim() || !currentHouseholdId) return;
    try {
      const created = await createCategory.mutateAsync({
        household_id: currentHouseholdId,
        name: newSubName.trim(),
        parent_id: parentId,
        color: parentColor,
        is_system: false,
      });
      toast.success(`Created "${newSubName.trim()}"`);
      setNewSubName("");
      setAddingTo(null);
      handleSelect(created.id);
    } catch {
      toast.error("Failed to create subcategory");
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setAddingTo(null); setNewSubName(""); } }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 text-xs rounded px-2 py-1 hover:bg-muted transition-colors text-left",
            triggerClassName
          )}
        >
          {category ? (
            <>
              <CategoryIcon
                iconName={resolveIcon(category)}
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: category.color ?? "#94a3b8" }}
              />
              <span className="truncate">{category.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align={align}>
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
        <div className="max-h-72 overflow-y-auto p-1">
          {/* Uncategorized option */}
          <button
            className={cn(
              "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-1.5",
              !value && "bg-accent"
            )}
            onClick={() => handleSelect(null)}
          >
            <div className="w-3.5 h-3.5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
            </div>
            <span className="text-muted-foreground">Uncategorized</span>
          </button>

          {filteredTree.map(({ parent, children, forceOpen }) => {
            const isExpanded = forceOpen || expanded.has(parent.id) || search.trim().length > 0;
            const hasChildren = children.length > 0;
            const isAddingHere = addingTo === parent.id;

            return (
              <div key={parent.id}>
                {/* Parent row */}
                <div className="flex items-center group/parent">
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
                    <CategoryIcon
                      iconName={parent.icon}
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: parent.color ?? "#94a3b8" }}
                    />
                    {parent.name}
                  </button>
                  <button
                    className="p-0.5 rounded hover:bg-accent shrink-0 opacity-0 group-hover/parent:opacity-100 transition-opacity mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingTo(parent.id);
                      setNewSubName("");
                      // Expand parent to show new input
                      setExpanded((prev) => new Set(prev).add(parent.id));
                    }}
                    title={`Add subcategory to ${parent.name}`}
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>

                {/* Children */}
                {isExpanded && (
                  <>
                    {children.map((child) => (
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

                    {/* Inline add subcategory */}
                    {isAddingHere && (
                      <div className="flex items-center gap-1 pl-6 pr-1 py-1">
                        <Input
                          placeholder="Subcategory name..."
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          className="h-6 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateSub(parent.id, parent.color);
                            if (e.key === "Escape") {
                              setAddingTo(null);
                              setNewSubName("");
                            }
                          }}
                        />
                        <button
                          className="p-0.5 rounded hover:bg-accent shrink-0"
                          onClick={() => handleCreateSub(parent.id, parent.color)}
                          disabled={!newSubName.trim()}
                        >
                          <Check className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button
                          className="p-0.5 rounded hover:bg-accent shrink-0"
                          onClick={() => {
                            setAddingTo(null);
                            setNewSubName("");
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {filteredTree.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              No categories found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
