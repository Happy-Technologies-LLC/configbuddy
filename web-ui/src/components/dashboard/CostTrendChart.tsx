import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface CostDataPoint {
  month: string;
  total: number;
  compute?: number;
  storage?: number;
  network?: number;
  data?: number;
  security?: number;
  applications?: number;
  budget?: number;
}

interface CostTrendChartProps {
  data: CostDataPoint[];
  title?: string;
  description?: string;
  showBudget?: boolean;
  stacked?: boolean;
}

export const CostTrendChart: React.FC<CostTrendChartProps> = ({
  data,
  title = 'Cost Trends',
  description = 'Monthly IT spend over time',
  showBudget = false,
  stacked = false,
}) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (stacked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="compute"
                stackId="1"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                name="Compute"
              />
              <Area
                type="monotone"
                dataKey="storage"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                name="Storage"
              />
              <Area
                type="monotone"
                dataKey="network"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                name="Network"
              />
              <Area
                type="monotone"
                dataKey="data"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
                name="Data"
              />
              <Area
                type="monotone"
                dataKey="security"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                name="Security"
              />
              <Area
                type="monotone"
                dataKey="applications"
                stackId="1"
                stroke="#ec4899"
                fill="#ec4899"
                name="Applications"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#8b5cf6"
              strokeWidth={3}
              name="Total Cost"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            {showBudget && (
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Budget"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
