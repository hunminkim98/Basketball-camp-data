"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TooltipBox } from "./chart-tooltip";
import { CHART } from "./theme";

export interface ParticipationDatum {
  camp: string;
  date: string;
  cumulative: number;
  participants: number;
  newPlayers: number;
}

/** 캠프별 누적 참가자 수. 가장 최근 캠프만 오렌지. */
export function ParticipationChart({ data }: { data: ParticipationDatum[] }) {
  const last = data.length - 1;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 8 }} barCategoryGap="30%">
          <XAxis
            dataKey="camp"
            tickLine={false}
            axisLine={{ stroke: CHART.base }}
            tick={{ fill: CHART.axis, fontSize: CHART.font }}
            interval={0}
          />
          <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.15)]} />
          <Tooltip
            cursor={{ fill: CHART.grid }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ParticipationDatum;
              return (
                <TooltipBox title={`${d.camp} (${d.date})`}>
                  누적 {d.cumulative}명 · 이번 캠프 {d.participants}명 · 신규 {d.newPlayers}명
                </TooltipBox>
              );
            }}
          />
          <Bar dataKey="cumulative" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === last ? CHART.accent : CHART.base} />
            ))}
            <LabelList
              dataKey="cumulative"
              position="top"
              formatter={(v) => `${v}명`}
              style={{ fill: CHART.ink, fontSize: 13, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
