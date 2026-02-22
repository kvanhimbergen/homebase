import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { parseISO, getDate } from "date-fns";
import { formatCurrency } from "@/lib/formatters";

interface DailyData {
  date: string;
  amount: number;
}

interface ChartPoint {
  day: number;
  current: number;
  previous: number;
}

function buildCumulativeSeries(
  data: DailyData[],
  daysInMonth: number
): Map<number, number> {
  const byDay = new Map<number, number>();
  for (const d of data) {
    const day = getDate(parseISO(d.date));
    byDay.set(day, (byDay.get(day) ?? 0) + d.amount);
  }

  const cumulative = new Map<number, number>();
  let running = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    running += byDay.get(day) ?? 0;
    cumulative.set(day, running);
  }
  return cumulative;
}

export function SpendingComparison({
  currentData,
  previousData,
  currentDaysInMonth,
  previousDaysInMonth,
  currentDayOfMonth,
}: {
  currentData: DailyData[];
  previousData: DailyData[];
  currentDaysInMonth: number;
  previousDaysInMonth: number;
  currentDayOfMonth?: number;
}) {
  const maxDays = Math.max(currentDaysInMonth, previousDaysInMonth);
  const currentCum = buildCumulativeSeries(currentData, currentDaysInMonth);
  const previousCum = buildCumulativeSeries(previousData, previousDaysInMonth);

  const chartData: ChartPoint[] = [];
  for (let day = 1; day <= maxDays; day++) {
    // For current month, only show up to the current day
    const currentVal =
      currentDayOfMonth != null && day > currentDayOfMonth
        ? undefined
        : currentCum.get(day) ?? 0;

    chartData.push({
      day,
      current: currentVal as number,
      previous: previousCum.get(day) ?? 0,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="day"
          className="text-xs fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          tickFormatter={(day) => `${day}`}
          interval="preserveStartEnd"
        />
        <YAxis
          className="text-xs fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) =>
            val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`
          }
          width={50}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-md text-sm">
                <p className="font-medium mb-1">Day {label}</p>
                {payload.map((p) => (
                  <p key={p.dataKey as string} style={{ color: p.color }}>
                    {p.dataKey === "current" ? "This month" : "Last month"}:{" "}
                    {formatCurrency(p.value as number)}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="previous"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="#94a3b8"
          fillOpacity={0.05}
          dot={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="current"
          stroke="#0ea5e9"
          strokeWidth={2}
          fill="#0ea5e9"
          fillOpacity={0.1}
          dot={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
