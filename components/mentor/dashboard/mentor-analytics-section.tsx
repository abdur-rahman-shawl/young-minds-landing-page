"use client";

import React, { useState } from 'react';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useMentorAnalytics } from '@/hooks/use-mentor-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Star, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useTheme } from "next-themes";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function MentorAnalyticsSection() {
  const { theme } = useTheme();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -89),
    to: new Date(),
  });

  const { data, isLoading, error } = useMentorAnalytics(dateRange);

  const isDark = theme === 'dark';
  const chartColor = isDark ? 'rgba(59, 130, 246, 0.8)' : 'rgba(37, 99, 235, 0.8)';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? '#e2e8f0' : '#475569';

  const renderContent = () => {
    if (isLoading) {
      return (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </CardContent>
      );
    }

    if (error) {
      return (
        <CardContent>
          <div className="flex flex-col items-center justify-center text-destructive h-64 bg-destructive/10 rounded-xl border border-destructive/20">
            <AlertTriangle className="h-10 w-10 mb-3" />
            <p className="font-semibold text-lg">Could Not Load Analytics</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </CardContent>
      );
    }

    if (!data) {
      return (
        <CardContent>
          <div className="flex flex-col items-center justify-center text-muted-foreground h-64 bg-muted/30 rounded-xl border border-dashed">
            <Calendar className="h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">No analytics data available</p>
            <p className="text-xs">Try selecting a different date range</p>
          </div>
        </CardContent>
      );
    }

    // If we have data, prepare it for the chart
    const earningsChartData = {
      labels: data.earningsOverTime.map(item => format(new Date(item.month), 'MMM yyyy')),
      datasets: [{
        label: 'Monthly Earnings',
        data: data.earningsOverTime.map(item => item.earnings),
        backgroundColor: chartColor,
        borderRadius: 4,
        hoverBackgroundColor: isDark ? 'rgba(96, 165, 250, 0.9)' : 'rgba(29, 78, 216, 0.9)',
      }],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          titleColor: isDark ? '#f1f5f9' : '#0f172a',
          bodyColor: isDark ? '#e2e8f0' : '#334155',
          borderColor: gridColor,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            callback: (value: string | number) => '$' + value,
            color: textColor,
            font: { size: 11 }
          },
          border: { display: false }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { size: 11 }
          },
          border: { display: false }
        }
      },
    };

    return (
      <CardContent className="space-y-6 pt-0">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/10 border-green-100 dark:border-green-900/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Period Earnings</p>
                <div className="p-2 bg-green-200/50 dark:bg-green-900/40 rounded-full">
                  <DollarSign className="h-4 w-4 text-green-700 dark:text-green-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-green-900 dark:text-green-100">
                  ${data.kpis.periodEarnings.toFixed(0)}
                </span>
                <span className="text-lg font-semibold text-green-700/80 dark:text-green-300/80">
                  {Number(data.kpis.periodEarnings.toFixed(2).split('.')[1]) > 0 && `.${data.kpis.periodEarnings.toFixed(2).split('.')[1]}`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-100 dark:border-blue-900/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Total Earnings</p>
                <div className="p-2 bg-blue-200/50 dark:bg-blue-900/40 rounded-full">
                  <TrendingUp className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  ${data.kpis.totalEarnings.toFixed(0)}
                </span>
                <span className="text-lg font-semibold text-blue-700/80 dark:text-blue-300/80">
                  {Number(data.kpis.totalEarnings.toFixed(2).split('.')[1]) > 0 && `.${data.kpis.totalEarnings.toFixed(2).split('.')[1]}`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/10 border-yellow-100 dark:border-yellow-900/50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Average Rating</p>
                <div className="p-2 bg-yellow-200/50 dark:bg-yellow-900/40 rounded-full">
                  <Star className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                  {data.kpis.averageRating ? parseFloat(data.kpis.averageRating.toString()).toFixed(1) : '—'}
                </span>
                {data.kpis.averageRating && (
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < Math.round(data.kpis.averageRating || 0)
                            ? "fill-yellow-500 text-yellow-500"
                            : "fill-muted text-muted-foreground/30"
                          }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Chart Section */}
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-lg">Earnings History</CardTitle>
              <CardDescription>Monthly breakdown of your mentorship income</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <Bar options={chartOptions} data={earningsChartData} />
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Reviews</CardTitle>
                <CardDescription>Latest feedback from your mentees</CardDescription>
              </div>
              <Badge variant="outline">{data.recentReviews.length} Reviews</Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-4">
              {data.recentReviews.length > 0 ? (
                data.recentReviews.map(review => (
                  <div key={review.reviewId} className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {review.menteeName?.slice(0, 2).toUpperCase() || 'ME'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{review.menteeName}</p>
                        <Badge variant="secondary" className="gap-1 h-5 text-[10px] font-normal">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {review.rating ? parseFloat(review.rating.toString()).toFixed(1) : 'N/A'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.feedback || <span className="italic text-muted-foreground/50">No written feedback provided.</span>}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
                  <Star className="h-10 w-10 mb-3 opacity-20" />
                  <p>No reviews found for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track your performance and earnings metrics</p>
        </div>
        <DateRangePicker range={dateRange} onDateChange={setDateRange} />
      </div>

      <Card className="w-full border-0 shadow-none bg-transparent">
        {renderContent()}
      </Card>
    </div>
  );
}