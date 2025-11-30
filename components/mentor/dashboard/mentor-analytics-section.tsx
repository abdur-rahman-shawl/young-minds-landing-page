"use client";

import React, { useState } from 'react';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useMentorAnalytics } from '@/hooks/use-mentor-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function MentorAnalyticsSection() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -89),
    to: new Date(),
  });

  const { data, isLoading, error } = useMentorAnalytics(dateRange);

  // This is the rendering logic that will now work correctly
  const renderContent = () => {
    if (isLoading) {
      return (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full mt-6" />
        </CardContent>
      );
    }

    if (error) {
      return (
        <CardContent>
          <div className="flex flex-col items-center justify-center text-red-600 h-64">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Could Not Load Analytics</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      );
    }

    if (!data) {
      return (
        <CardContent>
          <div className="flex items-center justify-center text-gray-500 h-64">
            <p>No analytics data available for the selected period.</p>
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
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }],
    };

    const chartOptions = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: (value: string | number) => '$' + value } } },
    };

    // Render the full dashboard
    return (
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1"><p className="text-sm text-gray-600">Period Earnings</p><DollarSign className="h-4 w-4 text-green-500" /></div>
            <p className="text-2xl font-bold">${data.kpis.periodEarnings.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1"><p className="text-sm text-gray-600">Total Earnings</p><TrendingUp className="h-4 w-4 text-blue-500" /></div>
            <p className="text-2xl font-bold">${data.kpis.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1"><p className="text-sm text-gray-600">Average Rating</p><Star className="h-4 w-4 text-yellow-500" /></div>
            <p className="text-2xl font-bold">{data.kpis.averageRating ? parseFloat(data.kpis.averageRating.toString()).toFixed(1) : 'N/A'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Earnings Over Time</h3>
            <Bar options={chartOptions} data={earningsChartData} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Recent Reviews</h3>
            <div className="space-y-3">
              {data.recentReviews.length > 0 ? (
                data.recentReviews.map(review => (
                  <div key={review.reviewId} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium">{review.menteeName}</p>
                      <div className="flex items-center gap-1 text-sm text-yellow-600">
                        <Star className="h-4 w-4" />
                        <span>{review.rating ? parseFloat(review.rating.toString()).toFixed(1) : 'N/A'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{review.feedback}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Analytics</CardTitle>
          <CardDescription>Performance overview for the selected period</CardDescription>
        </div>
        <DateRangePicker range={dateRange} onDateChange={setDateRange} />
      </CardHeader>
      {renderContent()}
    </Card>
  );
}