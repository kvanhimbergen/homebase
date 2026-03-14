import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/formatters";
import { groupSpendingByParent, type SpendingItem } from "./SpendingDonut";

const FALLBACK_COLORS = [
  "#0ea5e9", "#f97316", "#22c55e", "#a855f7", "#ef4444",
  "#eab308", "#06b6d4", "#ec4899", "#84cc16", "#6366f1",
  "#14b8a6", "#f43f5e",
];

function resolveColor(color: string | null, index: number): string {
  if (!color) return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  if (color.startsWith("#") || color.startsWith("rgb")) return color;
  const el = document.documentElement;
  const resolved = getComputedStyle(el).getPropertyValue(
    color.replace("var(", "").replace(")", "")
  );
  return resolved
    ? `oklch(${resolved.trim()})`
    : FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

/* ── Layout constants ────────────────────────────────── */
const LEFT_X = 70;
const BAR_W = 28;
const RIGHT_X = 470;
const LABEL_X = RIGHT_X + BAR_W + 14;
const MID_X = (LEFT_X + BAR_W + RIGHT_X) / 2;
const SVG_W = 880;
const PAD_TOP = 36;
const PAD_BOT = 32;
const BAND_GAP = 5;
const MIN_H = 26;

interface IncomeFlowChartProps {
  income: number;
  spending: SpendingItem[];
  onCategoryClick?: (categoryId: string) => void;
}

export function IncomeFlowChart({
  income,
  spending,
  onCategoryClick,
}: IncomeFlowChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const grouped = useMemo(
    () => groupSpendingByParent(spending, null),
    [spending]
  );

  const totalExpenses = grouped.reduce((s, c) => s + Math.abs(c.total), 0);
  const savings = Math.max(0, income - totalExpenses);

  const items = useMemo(() => {
    const result = grouped.map((c, i) => ({
      id: c.category_id,
      name: c.category_name,
      icon: c.category_icon,
      color: resolveColor(c.category_color, i),
      amount: Math.abs(c.total),
    }));
    if (savings > 0) {
      result.push({
        id: "__savings__",
        name: "Net Savings",
        icon: null,
        color: "oklch(0.723 0.191 149.579)",
        amount: savings,
      });
    }
    return result;
  }, [grouped, savings]);

  const totalFlow = totalExpenses + savings;

  const { bands, totalHeight } = useMemo(() => {
    if (items.length === 0 || totalFlow === 0) {
      return { bands: [], totalHeight: PAD_TOP + PAD_BOT + 100 };
    }

    const targetArea = Math.max(300, items.length * 34);
    const heights = items.map((item) =>
      Math.max(MIN_H, (item.amount / totalFlow) * targetArea)
    );

    // Right side — stacked with gaps
    let y = PAD_TOP;
    const result = items.map((item, i) => {
      const h = heights[i];
      const band = {
        ...item,
        height: h,
        rightTop: y,
        rightBottom: y + h,
        leftTop: 0,
        leftBottom: 0,
      };
      y += h + BAND_GAP;
      return band;
    });

    // Left side — stacked without gaps, vertically centered
    const leftTotalH = heights.reduce((s, h) => s + h, 0);
    const rightExtent = y - BAND_GAP;
    const leftStartY =
      PAD_TOP + (rightExtent - PAD_TOP - leftTotalH) / 2;
    let leftY = leftStartY;

    for (const band of result) {
      band.leftTop = leftY;
      band.leftBottom = leftY + band.height;
      leftY += band.height;
    }

    return { bands: result, totalHeight: rightExtent + PAD_BOT };
  }, [items, totalFlow]);

  if (items.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${totalHeight}`}
      className="w-full"
      style={{ minWidth: 480 }}
    >
      {/* ── Flowing bands ─────────────────────────────── */}
      {bands.map((band) => {
        const l = LEFT_X + BAR_W;
        const r = RIGHT_X;
        const isHovered = hoveredId === band.id;
        const isDimmed = hoveredId !== null && !isHovered;
        const clickable = band.id !== "__savings__" && !!onCategoryClick;

        const curvePath = [
          `M ${l} ${band.leftTop}`,
          `C ${MID_X} ${band.leftTop}, ${MID_X} ${band.rightTop}, ${r} ${band.rightTop}`,
          `L ${r} ${band.rightBottom}`,
          `C ${MID_X} ${band.rightBottom}, ${MID_X} ${band.leftBottom}, ${l} ${band.leftBottom}`,
          "Z",
        ].join(" ");

        return (
          <g
            key={band.id}
            onMouseEnter={() => setHoveredId(band.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => clickable && onCategoryClick!(band.id)}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            {/* Left bar segment */}
            <rect
              x={LEFT_X}
              y={band.leftTop}
              width={BAR_W}
              height={band.height}
              fill={band.color}
              fillOpacity={isDimmed ? 0.15 : 0.9}
              style={{ transition: "fill-opacity 200ms" }}
            />
            {/* Curve */}
            <path
              d={curvePath}
              fill={band.color}
              fillOpacity={isDimmed ? 0.06 : isHovered ? 0.55 : 0.4}
              style={{ transition: "fill-opacity 200ms" }}
            />
            {/* Right bar segment */}
            <rect
              x={RIGHT_X}
              y={band.rightTop}
              width={BAR_W}
              height={band.height}
              fill={band.color}
              fillOpacity={isDimmed ? 0.15 : 0.9}
              rx={3}
              style={{ transition: "fill-opacity 200ms" }}
            />
          </g>
        );
      })}

      {/* ── Right‑side labels ─────────────────────────── */}
      {bands.map((band) => {
        const cy = (band.rightTop + band.rightBottom) / 2;
        const pct = totalFlow > 0 ? (band.amount / totalFlow) * 100 : 0;
        const isDimmed = hoveredId !== null && hoveredId !== band.id;
        const clickable = band.id !== "__savings__" && !!onCategoryClick;

        return (
          <g
            key={`label-${band.id}`}
            opacity={isDimmed ? 0.2 : 1}
            style={{
              transition: "opacity 200ms",
              cursor: clickable ? "pointer" : "default",
            }}
            onMouseEnter={() => setHoveredId(band.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => clickable && onCategoryClick!(band.id)}
          >
            {/* Category name */}
            <text
              x={LABEL_X}
              y={cy - 7}
              fontSize="13"
              fontWeight="500"
              dominantBaseline="middle"
              style={{ fill: "var(--color-foreground)" }}
            >
              {band.icon ? `${band.icon}  ` : ""}
              {band.name}
            </text>
            {/* Amount + percent */}
            <text
              x={LABEL_X}
              y={cy + 9}
              fontSize="11.5"
              dominantBaseline="middle"
              style={{ fill: "var(--color-muted-foreground)" }}
            >
              {formatCurrency(band.amount)} ({pct.toFixed(2)}%)
            </text>
          </g>
        );
      })}

      {/* ── Income label (left) ───────────────────────── */}
      {bands.length > 0 && (
        <>
          <text
            x={LEFT_X + BAR_W / 2}
            y={bands[0].leftTop - 14}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            style={{ fill: "var(--color-foreground)" }}
          >
            Income
          </text>
          <text
            x={LEFT_X + BAR_W / 2}
            y={bands[bands.length - 1].leftBottom + 18}
            textAnchor="middle"
            fontSize="12"
            fontWeight="500"
            style={{ fill: "var(--color-muted-foreground)" }}
          >
            {formatCurrency(income)}
          </text>
        </>
      )}
    </svg>
  );
}
