import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface CashFlowDataPoint {
  month: string;
  income: number;
  expenses: number;
}

export function CashFlowBar({
  data,
  height = 300,
  onBarClick,
}: {
  data: CashFlowDataPoint[];
  height?: number;
  onBarClick?: (month: string, type: "income" | "expenses") => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="month"
          className="text-xs fill-muted-foreground"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          className="text-xs fill-muted-foreground"
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
        />
        <Tooltip
          wrapperStyle={{ zIndex: 50 }}
          allowEscapeViewBox={{ x: true, y: true }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-md text-sm">
                <p className="font-medium mb-1">{label}</p>
                {payload.map((p) => (
                  <p key={p.dataKey as string} style={{ color: p.color }}>
                    {p.name}: {formatCurrency(p.value as number)}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend />
        <Bar
          dataKey="income"
          name="Income"
          fill="var(--color-income)"
          radius={[4, 4, 0, 0]}
          className={onBarClick ? "cursor-pointer" : ""}
          onClick={(data) => onBarClick?.((data as unknown as CashFlowDataPoint).month, "income")}
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="var(--color-expense)"
          radius={[4, 4, 0, 0]}
          className={onBarClick ? "cursor-pointer" : ""}
          onClick={(data) => onBarClick?.((data as unknown as CashFlowDataPoint).month, "expenses")}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
