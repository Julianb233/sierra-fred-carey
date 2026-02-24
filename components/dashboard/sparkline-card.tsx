"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineCardProps {
  title: string;
  value: string | number;
  data: { value: number }[];
  color: string;
  expanded: boolean;
  onToggle: () => void;
}

export function SparklineCard({
  title,
  value,
  data,
  color,
  expanded,
  onToggle,
}: SparklineCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md border-orange-100/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-sm ${
        expanded ? "ring-2 ring-offset-2 ring-[#ff6a1a]/40" : ""
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <div className="mt-2">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={data}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-10 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No data yet</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
