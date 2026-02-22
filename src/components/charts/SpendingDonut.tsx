import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface SpendingItem {
  category_id: string;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  total: number;
  parent_id: string | null;
}

const FALLBACK_COLORS = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#6366f1",
  "#14b8a6",
  "#f43f5e",
];

function resolveColor(color: string | null, index: number): string {
  if (!color) return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  if (color.startsWith("#") || color.startsWith("rgb")) return color;
  // CSS variables need to be resolved
  const el = document.documentElement;
  const resolved = getComputedStyle(el).getPropertyValue(
    color.replace("var(", "").replace(")", "")
  );
  return resolved ? `oklch(${resolved.trim()})` : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/**
 * Groups spending data for drill-down display.
 * When selectedParentId is null, sums child categories into their parents.
 * When selectedParentId is set, shows only children of that parent.
 */
export function groupSpendingByParent(
  data: SpendingItem[],
  selectedParentId: string | null
): SpendingItem[] {
  if (selectedParentId) {
    // Show children of the selected parent
    return data
      .filter((item) => item.parent_id === selectedParentId)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }

  // Group: sum children into parents
  const parentMap = new Map<string, SpendingItem>();
  const childTotals = new Map<string, number>();

  for (const item of data) {
    if (!item.parent_id) {
      // It's a parent category
      if (!parentMap.has(item.category_id)) {
        parentMap.set(item.category_id, { ...item });
      }
    } else {
      // It's a child — accumulate into parent total
      childTotals.set(
        item.parent_id,
        (childTotals.get(item.parent_id) ?? 0) + item.total
      );
      // Ensure parent entry exists (for parent categories with no direct spend)
      if (!parentMap.has(item.parent_id)) {
        const parentEntry = data.find((d) => d.category_id === item.parent_id);
        if (parentEntry) {
          parentMap.set(item.parent_id, { ...parentEntry, total: 0 });
        }
      }
    }
  }

  // Merge child totals into parents
  for (const [parentId, childTotal] of childTotals) {
    const parent = parentMap.get(parentId);
    if (parent) {
      parent.total += childTotal;
    }
  }

  return Array.from(parentMap.values())
    .filter((item) => Math.abs(item.total) > 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

/** Check if a parent category has children in the raw data */
export function hasChildren(data: SpendingItem[], categoryId: string): boolean {
  return data.some((item) => item.parent_id === categoryId);
}

export function SpendingDonut({
  data,
  total,
  onCategoryClick,
  selectedParentId,
  selectedParentName,
  onBack,
  hoveredCategoryId,
  onHoverCategory,
}: {
  data: SpendingItem[];
  total: number;
  onCategoryClick?: (categoryId: string, hasChildren: boolean) => void;
  selectedParentId?: string | null;
  selectedParentName?: string | null;
  onBack?: () => void;
  hoveredCategoryId?: string | null;
  onHoverCategory?: (categoryId: string | null) => void;
}) {
  const displayData = groupSpendingByParent(data, selectedParentId ?? null);
  const displayTotal = displayData.reduce(
    (sum, item) => sum + Math.abs(item.total),
    0
  );

  const chartData = displayData.map((item, i) => ({
    name: item.category_name,
    value: Math.abs(item.total),
    color: resolveColor(item.category_color, i),
    categoryId: item.category_id,
  }));

  return (
    <div className="relative">
      {selectedParentId && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            key={selectedParentId ?? "root"}
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
            style={onCategoryClick ? { cursor: "pointer" } : undefined}
            onClick={
              onCategoryClick
                ? (_data, index) => {
                    const id = chartData[index].categoryId;
                    onCategoryClick(id, hasChildren(data, id));
                  }
                : undefined
            }
            onMouseEnter={
              onHoverCategory
                ? (_data, index) => onHoverCategory(chartData[index].categoryId)
                : undefined
            }
            onMouseLeave={
              onHoverCategory ? () => onHoverCategory(null) : undefined
            }
          >
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                fillOpacity={
                  hoveredCategoryId && hoveredCategoryId !== entry.categoryId
                    ? 0.3
                    : 1
                }
                stroke={
                  hoveredCategoryId === entry.categoryId
                    ? entry.color
                    : "transparent"
                }
                strokeWidth={hoveredCategoryId === entry.categoryId ? 3 : 0}
                style={{ transition: "fill-opacity 150ms, stroke-width 150ms" }}
              />
            ))}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: 50 }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={20}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0];
              return (
                <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-md text-sm">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(item.value as number)}
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {selectedParentName ?? "Total Spent"}
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(selectedParentId ? displayTotal : total)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SpendingLegend({
  data,
  onCategoryClick,
  selectedParentId,
  hoveredCategoryId,
  onHoverCategory,
}: {
  data: SpendingItem[];
  onCategoryClick?: (categoryId: string, hasChildren: boolean) => void;
  selectedParentId?: string | null;
  hoveredCategoryId?: string | null;
  onHoverCategory?: (categoryId: string | null) => void;
}) {
  const displayData = groupSpendingByParent(data, selectedParentId ?? null);
  const total = displayData.reduce(
    (sum, item) => sum + Math.abs(item.total),
    0
  );

  return (
    <div className="space-y-1">
      {displayData.map((item, i) => {
        const pct = total > 0 ? (Math.abs(item.total) / total) * 100 : 0;
        const itemHasChildren = hasChildren(data, item.category_id);
        const Row = onCategoryClick ? "button" : "div";
        const isDimmed =
          hoveredCategoryId && hoveredCategoryId !== item.category_id;

        return (
          <Row
            key={item.category_id}
            className={cn(
              "flex items-center gap-3 w-full transition-opacity duration-150",
              onCategoryClick &&
                "rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors text-left cursor-pointer",
              isDimmed && "opacity-40"
            )}
            onClick={
              onCategoryClick
                ? () => onCategoryClick(item.category_id, itemHasChildren)
                : undefined
            }
            onMouseEnter={
              onHoverCategory
                ? () => onHoverCategory(item.category_id)
                : undefined
            }
            onMouseLeave={
              onHoverCategory ? () => onHoverCategory(null) : undefined
            }
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: resolveColor(item.category_color, i),
              }}
            />
            <span className="text-sm flex-1 truncate">
              {item.category_name}
            </span>
            {itemHasChildren && !selectedParentId && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-sm text-muted-foreground tabular-nums">
              {pct.toFixed(0)}%
            </span>
            <span className="text-sm font-medium tabular-nums w-24 text-right">
              {formatCurrency(Math.abs(item.total))}
            </span>
          </Row>
        );
      })}
    </div>
  );
}
