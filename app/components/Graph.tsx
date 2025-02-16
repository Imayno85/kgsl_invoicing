"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface iAppProps {
  data: {
    date: string;
    amount: number;
  }[];
}

export function Graph({data}: iAppProps) {
//   const data = [
//     { date: "Nov 5", amount: "450000" },
//     { date: "Nov 8", amount: "500000" },
//     { date: "Nov 10", amount: "320000" },
//     { date: "Nov 12", amount: "350000" },
//     { date: "Nov 15", amount: "750000" },
//     { date: "Nov 16", amount: "850000" },
//     { date: "Nov 17", amount: "350000" },
//   ];
  return (
    <ChartContainer
      config={{
        amount: {
          label: " Amount",
          color: "hsl(var(--primary))",
        },
      }}
      className="min-h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--color-amount)"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
