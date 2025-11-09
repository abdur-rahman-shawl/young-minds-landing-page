"use client";

import React, { useState } from 'react';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useMentorAnalytics } from '@/hooks/use-mentor-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// Import the new component
import { DateRangePicker } from '@/components/ui/date-range-picker';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function MentorAnalyticsSection() {
  // 1. Add state to manage the selected date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -89), // Default to last 90 days
    to: new Date(),
  });

  // 2. Pass the dateRange state to our updated hook
  const { data, isLoading, error } = useMentorAnalytics(dateRange);

  // ... (Loading, Error, and No Data states remain the same) ...
  if (isLoading) { /* ... */ }
  if (error) { /* ... */ }
  if (!data) { return null; }

  // ... (Chart data preparation remains the same) ...
  const earningsChartData = { /* ... */ };
  const chartOptions = { /* ... */ };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Analytics</CardTitle>
          <CardDescription>Performance overview for the selected period</CardDescription>
        </div>
        {/* 3. Add the DateRangePicker component to the header */}
        <DateRangePicker range={dateRange} onDateChange={setDateRange} />
      </CardHeader>
      <CardContent>
        {/* The rest of the component remains the same */}
        {/* ... KPI Cards ... */}
        {/* ... Earnings Chart and Recent Reviews ... */}
      </CardContent>
    </Card>
  );
}