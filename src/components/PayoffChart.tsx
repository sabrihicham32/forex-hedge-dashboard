
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
  riskReward?: {
    bestCase: number;
    worstCase: number;
    bestCaseSpot: number;
    worstCaseSpot: number;
    riskRewardRatio: number;
  };
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

const PayoffChart = ({ data, selectedStrategy, spot, riskReward }: PayoffChartProps) => {
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

    // Add reference lines for current spot and best/worst case
    let referenceLines = [
      <ReferenceLine
        key="spot"
        x={spot}
        stroke="#6B7280"
        strokeWidth={1}
        label={{
          value: "Current Spot",
          position: "insideTop" as "insideTop" | "insideBottom",
          fill: "#6B7280",
          fontSize: 12,
        }}
      />,
    ];

    // Add best/worst case reference lines if available
    if (riskReward) {
      referenceLines.push(
        <ReferenceLine
          key="best-case"
          x={riskReward.bestCaseSpot}
          stroke="#10B981"
          strokeWidth={1}
          strokeDasharray="3 3"
          label={{
            value: `Best Case: ${riskReward.bestCase.toFixed(4)}`,
            position: "insideTop" as "insideTop" | "insideBottom",
            fill: "#10B981",
            fontSize: 12,
          }}
        />,
        <ReferenceLine
          key="worst-case"
          x={riskReward.worstCaseSpot}
          stroke="#EF4444"
          strokeWidth={1}
          strokeDasharray="3 3"
          label={{
            value: `Worst Case: ${riskReward.worstCase.toFixed(4)}`,
            position: "insideBottom" as "insideTop" | "insideBottom",
            fill: "#EF4444",
            fontSize: 12,
          }}
        />
      );
    }

    // Add strategy-specific reference lines
    if (selectedStrategy === "custom" && data.length > 0) {
      // Find all strike and barrier keys
      const firstDataPoint = data[0];
      const keys = Object.keys(firstDataPoint);
      
      // Collect all strike and barrier keys
      const optionKeys = keys.filter(key => 
        key.includes('Strike') || 
        key.includes('Upper Barrier') || 
        key.includes('Lower Barrier')
      );
      
      // Sort the keys to show strikes first, then barriers
      optionKeys.sort((a, b) => {
        // Put strikes first
        if (a.includes('Strike') && !b.includes('Strike')) return -1;
        if (!a.includes('Strike') && b.includes('Strike')) return 1;
        return a.localeCompare(b);
      });
      
      // Add reference lines for each option component
      optionKeys.forEach(key => {
        if (firstDataPoint[key]) {
          let color = "#047857"; // Default green for strikes
          let dashArray = "3 3";
          let position: "insideTop" | "insideBottom" = "insideTop"; 
          
          if (key.includes('Upper Barrier')) {
            color = "#EF4444"; // Red for upper barriers
            dashArray = "5 5";
          } else if (key.includes('Lower Barrier')) {
            color = "#10B981"; // Green for lower barriers
            dashArray = "5 5";
            position = "insideBottom";
          }
          
          referenceLines.push(
            <ReferenceLine
              key={key}
              x={firstDataPoint[key]}
              stroke={color}
              strokeWidth={1}
              strokeDasharray={dashArray}
              label={{
                value: key,
                position: position,
                fill: color,
                fontSize: 12,
              }}
            />
          );
        }
      });
    } 
    // Add reference lines for other strategies
    else if (selectedStrategy === "callKO" && data.length > 0) {
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
              position: "insideTop" as "insideTop" | "insideBottom",
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
              position: "insideTop" as "insideTop" | "insideBottom",
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
              position: "insideTop" as "insideTop" | "insideBottom",
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
              position: "insideBottom" as "insideTop" | "insideBottom",
              fill: "#10B981",
              fontSize: 12,
            }}
          />
        );
      }
    }

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
        {riskReward && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded">
              <span className="font-medium">Best Case:</span>{" "}
              {riskReward.bestCase.toFixed(4)} at {riskReward.bestCaseSpot.toFixed(4)}
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded">
              <span className="font-medium">Worst Case:</span>{" "}
              {riskReward.worstCase.toFixed(4)} at {riskReward.worstCaseSpot.toFixed(4)}
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded col-span-2">
              <span className="font-medium">Risk/Reward Ratio:</span>{" "}
              {riskReward.riskRewardRatio.toFixed(2)}
            </div>
          </div>
        )}
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
