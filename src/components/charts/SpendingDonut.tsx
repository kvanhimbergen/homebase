import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface SpendingItem {
  category_id: string;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  total: number;
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

export function SpendingDonut({
  data,
  total,
}: {
  data: SpendingItem[];
  total: number;
}) {
  const chartData = data.map((item, i) => ({
    name: item.category_name,
    value: Math.abs(item.total),
    color: resolveColor(item.category_color, i),
  }));

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
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
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </div>
      </div>
    </div>
  );
}

export function SpendingLegend({ data }: { data: SpendingItem[] }) {
  const total = data.reduce((sum, item) => sum + Math.abs(item.total), 0);

  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const pct = total > 0 ? (Math.abs(item.total) / total) * 100 : 0;
        return (
          <div key={item.category_id} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: resolveColor(item.category_color, i),
              }}
            />
            <span className="text-sm flex-1 truncate">{item.category_name}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {pct.toFixed(0)}%
            </span>
            <span className="text-sm font-medium tabular-nums w-24 text-right">
              {formatCurrency(Math.abs(item.total))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
