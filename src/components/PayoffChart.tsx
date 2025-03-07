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

    // Add strategy-specific lines
    if (selectedStrategy === "custom" && data.length > 0) {
      // Find all keys in the data that we need to display as reference lines
      const firstDataPoint = data[0];
      const keys = Object.keys(firstDataPoint);
      
      // Separate different types of keys for better visualization
      const strikeKeys = keys.filter(key => key.includes("Strike"));
      const upperBarrierKeys = keys.filter(key => key.includes("Upper Barrier"));
      const lowerBarrierKeys = keys.filter(key => key.includes("Lower Barrier"));
      
      // Add individual payoff lines for each option in custom strategy
      const optionKeys = keys.filter(key => key.includes("Option") && key.includes("Payoff"));
      optionKeys.forEach(key => {
        lines.push(
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={getRandomColor(key)}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        );
      });
      
      // Add strike reference lines
      strikeKeys.forEach(key => {
        if (firstDataPoint[key]) {
          referenceLines.push(
            <ReferenceLine
              key={key}
              x={firstDataPoint[key]}
              stroke="#047857"
              strokeWidth={1}
              strokeDasharray="3 3"
              label={{
                value: key,
                position: "top",
                fill: "#047857",
                fontSize: 12,
              }}
            />
          );
        }
      });
      
      // Add upper barrier reference lines
      upperBarrierKeys.forEach(key => {
        if (firstDataPoint[key]) {
          referenceLines.push(
            <ReferenceLine
              key={key}
              x={firstDataPoint[key]}
              stroke="#EF4444"
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: key,
                position: "top",
                fill: "#EF4444",
                fontSize: 12,
              }}
            />
          );
        }
      });
      
      // Add lower barrier reference lines
      lowerBarrierKeys.forEach(key => {
        if (firstDataPoint[key]) {
          referenceLines.push(
            <ReferenceLine
              key={key}
              x={firstDataPoint[key]}
              stroke="#10B981"
              strokeWidth={1}
              strokeDasharray="5 5"
              label={{
                value: key,
                position: "bottom",
                fill: "#10B981",
                fontSize: 12,
              }}
            />
          );
        }
      });
    } else if (selectedStrategy === "callKO" && data.length > 0) {
      // Add KO barrier line
      if (data[0]["KO Barrier"]) {
        referenceLines.push(
          <ReferenceLine
            key="ko-barrier"
            x={data[0]["KO Barrier"]}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="5 5"
            label={{
              value: "KO Barrier",
              position: "top",
              fill: "#EF4444",
              fontSize: 12,
            }}
          />
        );
      }
    } else if (selectedStrategy === "putKI" && data.length > 0) {
      // Add KI barrier line
      if (data[0]["KI Barrier"]) {
        referenceLines.push(
          <ReferenceLine
            key="ki-barrier"
            x={data[0]["KI Barrier"]}
            stroke="#10B981"
            strokeWidth={1}
            strokeDasharray="5 5"
            label={{
              value: "KI Barrier",
              position: "top",
              fill: "#10B981",
              fontSize: 12,
            }}
          />
        );
      }
    } else if (selectedStrategy === "callPutKI_KO" && data.length > 0) {
      // Add Upper and Lower barrier lines
      if (data[0]["Upper Barrier"]) {
        referenceLines.push(
          <ReferenceLine
            key="upper-barrier"
            x={data[0]["Upper Barrier"]}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="5 5"
            label={{
              value: "Upper KO",
              position: "top",
              fill: "#EF4444",
              fontSize: 12,
            }}
          />
        );
      }
      
      if (data[0]["Lower Barrier"]) {
        referenceLines.push(
          <ReferenceLine
            key="lower-barrier"
            x={data[0]["Lower Barrier"]}
            stroke="#10B981"
            strokeWidth={1}
            strokeDasharray="5 5"
            label={{
              value: "Lower KI",
              position: "bottom",
              fill: "#10B981",
              fontSize: 12,
            }}
          />
        );
      }
    }

    return { lines, referenceLines };
  };

  // Function to generate consistent colors for option payoff lines
  const getRandomColor = (key: string) => {
    const colors = [
      "#8B5CF6", // Purple
      "#EC4899", // Pink
      "#F59E0B", // Amber
      "#10B981", // Emerald
      "#3B82F6", // Blue
      "#6366F1", // Indigo
      "#D946EF", // Fuchsia
      "#F97316", // Orange
    ];
    
    // Use the key's hash to select a consistent color
    const sum = key.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
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
