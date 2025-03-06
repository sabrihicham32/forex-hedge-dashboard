
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { GlassContainer } from "@/components/ui/layout";

interface PayoffChartProps {
  data: any[];
  selectedStrategy: string;
  spot: number;
}

// Custom tooltip component for better styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
        <p className="font-semibold">Spot Rate: {Number(label).toFixed(4)}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {entry.name}: {Number(entry.value).toFixed(4)}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

const PayoffChart = ({ data, selectedStrategy, spot }: PayoffChartProps) => {
  // Configure lines based on strategy
  const getChartConfig = () => {
    // Base lines that are shown for all strategies
    const lines = [
      <Line
        key="hedged"
        type="monotone"
        dataKey="Hedged Rate"
        stroke="#3B82F6"
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 6 }}
      />,
      <Line
        key="unhedged"
        type="monotone"
        dataKey="Unhedged Rate"
        stroke="#9CA3AF"
        strokeWidth={2}
        strokeDasharray="4 4"
        dot={false}
        activeDot={{ r: 6 }}
      />,
    ];

    // Add reference lines based on strategy
    let referenceLines = [
      <ReferenceLine
        key="spot"
        x={spot}
        stroke="#6B7280"
        strokeWidth={1}
        label={{
          value: "Current Spot",
          position: "top",
          fill: "#6B7280",
          fontSize: 12,
        }}
      />,
    ];

    return { lines, referenceLines };
  };

  const { lines, referenceLines } = getChartConfig();

  const chartData = data?.length > 0 ? data : [];

  return (
    <GlassContainer className="p-0 overflow-hidden mt-6">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-medium">Payoff Profile</h3>
        <p className="text-sm text-muted-foreground">
          Visualize how the {selectedStrategy} strategy performs across different exchange rates
        </p>
      </div>
      <div className="p-4" style={{ height: "400px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="spot"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => value.toFixed(2)}
              label={{
                value: "Exchange Rate",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              tickFormatter={(value) => value.toFixed(2)}
              domain={["dataMin - 0.05", "dataMax + 0.05"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            {lines}
            {referenceLines}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassContainer>
  );
};

export default PayoffChart;
