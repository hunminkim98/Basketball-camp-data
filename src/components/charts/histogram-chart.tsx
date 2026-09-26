"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TooltipBox } from "./chart-tooltip";
import { CHART } from "./theme";

export interface HistogramDatum {
  label: string;
  range: string;
  count: number;
  highlight: boolean;
}

/** 분포 히스토그램. 강조 구간 하나만 오렌지, 막대 위에 인원 직접 표기. */
export function HistogramChart({ data, height = 240 }: { data: HistogramDatum[]; height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 22, right: 4, bottom: 0, left: 4 }} barCategoryGap={2}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: CHART.base }}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            interval={0}
          />
          <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(1, Math.ceil(max * 1.15))]} />
          <Tooltip
            cursor={{ fill: CHART.grid }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as HistogramDatum;
              return <TooltipBox title={d.range}>{d.count}명</TooltipBox>;
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.highlight ? CHART.accent : CHART.base} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              formatter={(v) => (Number(v) > 0 ? `${v}명` : "")}
              style={{ fill: CHART.ink, fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
