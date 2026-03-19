"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Year 1", strategy: 2, studio: 1.5 },
  { name: "Year 2", strategy: 6, studio: 5 },
  { name: "Year 3", strategy: 18, studio: 15 },
];

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fontWeight: "bold", fill: "#475467" }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#475467" }}
          domain={[0, 60]}
          ticks={[0, 15, 30, 45, 60]}
        />
        <Bar dataKey="strategy" fill="#101828" barSize={40} />
        <Bar dataKey="studio" fill="#475467" barSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
