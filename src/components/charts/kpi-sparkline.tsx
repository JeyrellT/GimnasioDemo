"use client";

import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Dot } from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KpiSparklineProps {
  /** Raw numeric series, oldest first. Fewer than 2 values renders a dashed placeholder. */
  data: number[];
  /** Container height in px. Defaults to 32. */
  height?: number;
  /** Stroke color. Defaults to Blackline Fitness primary #3B82F6. */
  color?: string;
  /**
   * Fixed pixel width. When omitted the chart fills its parent via
   * ResponsiveContainer (preferred for flex/grid layouts).
   */
  width?: number;
}

// ---------------------------------------------------------------------------
// Internal recharts data shape
// ---------------------------------------------------------------------------

interface SparkPoint {
  i: number;
  v: number;
}

// ---------------------------------------------------------------------------
// Custom dot renderer — only paints the final data point
// ---------------------------------------------------------------------------

interface LastDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  dataLength: number;
  color: string;
}

function LastDot({ cx, cy, index, dataLength, color }: LastDotProps) {
  if (index !== dataLength - 1 || cx === undefined || cy === undefined) {
    return <g />;
  }
  return <Dot cx={cx} cy={cy} r={3} fill={color} stroke={color} strokeWidth={0} />;
}

// ---------------------------------------------------------------------------
// Placeholder for < 2 data points
// ---------------------------------------------------------------------------

function DashedPlaceholder({ height }: { height: number }) {
  return (
    <svg
      width="100%"
      height={height}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <line
        x1={0}
        y1={height / 2}
        x2="100%"
        y2={height / 2}
        stroke="#3F3F46"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KpiSparkline({
  data,
  height = 32,
  color = "#3B82F6",
  width,
}: KpiSparklineProps) {
  const chartData = useMemo<SparkPoint[]>(
    () => data.map((v, i) => ({ i, v })),
    [data],
  );

  if (data.length < 2) {
    return (
      <div
        aria-hidden="true"
        style={{ width: width ?? "100%", height, flexShrink: 0 }}
      >
        <DashedPlaceholder height={height} />
      </div>
    );
  }

  const len = chartData.length;

  const line = (
    <Line
      type="monotone"
      dataKey="v"
      stroke={color}
      strokeWidth={2}
      isAnimationActive={false}
      dot={(props: {
        cx?: number;
        cy?: number;
        index?: number;
        key?: string;
      }) => (
        <LastDot
          key={props.key ?? `dot-${props.index}`}
          cx={props.cx}
          cy={props.cy}
          index={props.index}
          dataLength={len}
          color={color}
        />
      )}
    />
  );

  const margin = { top: 3, right: 3, bottom: 3, left: 3 };

  return (
    <div
      aria-hidden="true"
      style={{ width: width ?? "100%", height, flexShrink: 0 }}
    >
      {width !== undefined ? (
        // Fixed-width: ResponsiveContainer needs an explicit numeric width
        <ResponsiveContainer width={width} height={height}>
          <LineChart data={chartData} margin={margin}>
            {line}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        // Fluid: fills container
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={margin}>
            {line}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
