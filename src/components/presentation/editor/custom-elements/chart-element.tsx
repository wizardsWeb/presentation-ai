"use client";

import React from "react";
import { cn, withRef } from "@udecode/cn";
import { type TElement } from "@udecode/plate-common";
import { createPlatePlugin } from "@udecode/plate-core/react";
import { PlateElement } from "@/components/text-editor/plate-ui/plate-element";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export const CHART_ELEMENT = "chart";

export interface ChartElement extends TElement {
  type: typeof CHART_ELEMENT;
  chartType: string;
  data: Array<{ label: string; value: number }>;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

const ChartComponent = withRef<typeof PlateElement>(
  ({ className, children, element, ...props }, ref) => {
    const chartElement = element as ChartElement;
    const { chartType, data } = chartElement;

    // Transform data for Recharts
    const chartData = data.map((item, index) => ({
      name: item.label,
      value: item.value,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const config = {
      value: {
        label: "Value",
      },
    };

    const renderChart = () => {
      switch (chartType) {
        case "vertical-bar":
        case "bar":
          return (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          );

        case "horizontal-bar":
          return (
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" tick={{ fill: "currentColor" }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          );

        case "line":
          return (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={CHART_COLORS[0]} 
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[0], r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          );

        case "area":
          return (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={CHART_COLORS[0]} 
                fill={CHART_COLORS[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          );

        case "pie":
          return (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => 
                  percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          );

        default:
          return (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          );
      }
    };

    if (!data || data.length === 0) {
      return (
        <PlateElement ref={ref} className={cn(className)} element={element} {...props}>
          <div className="w-full h-64 flex items-center justify-center border border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">No chart data available</p>
          </div>
          {children}
        </PlateElement>
      );
    }

    return (
      <PlateElement ref={ref} className={cn(className, "my-4")} element={element} {...props}>
        <div className="w-full h-64">
          <ChartContainer config={config}>
            {renderChart()}
          </ChartContainer>
        </div>
        {children}
      </PlateElement>
    );
  }
);

export const ChartPlugin = createPlatePlugin({
  key: CHART_ELEMENT,
  node: {
    isElement: true,
    isVoid: true,
    component: ChartComponent,
  },
});

