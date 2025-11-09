"use client";

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useMentorAnalytics } from '@/hooks/use-mentor-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Star, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// Register the components Chart.js needs to draw the bar chart
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export function MentorAnalyticsSection() {
  // 1. Use our custom hook to get the analytics data
  const { data, isLoading, error } = useMentorAnalytics();

  // 2. Handle loading and error states first
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full mt-6" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle />
            Could Not Load Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // If loading is finished but there's no data, show a message
  if (!data) {
    return null; // Or a "No analytics data yet" message
  }

  // 3. Prepare data for the bar chart
  const earningsChartData = {
    labels: data.earningsOverTime.map(item => format(new Date(item.month), 'MMM yyyy')),
    datasets: [
      {
        label: 'Monthly Earnings',
        data: data.earningsOverTime.map(item => item.earnings),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: string | number) {
            return '$' + value;
          }
        }
      },
    },
  };

  // 4. Render the component with the fetched data
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Analytics</CardTitle>
        <CardDescription>Performance overview for the last 90 days</CardDescription>
      </CardHeader>
      <CardContent>
        {/* KPI Cards for the new analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600">Period Earnings</p>
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">${data.kpis.periodEarnings.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600">Total Earnings</p>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">${data.kpis.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600">Average Rating</p>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">
              {data.kpis.averageRating ? data.kpis.averageRating.toFixed(1) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Earnings Chart and Recent Reviews */}
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
                        <span>{review.rating ? parseFloat(review.rating).toFixed(1) : 'N/A'}</span>
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
    </Card>
  );
}