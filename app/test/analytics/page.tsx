// This directive tells Next.js that this is a "Client Component".
// We need this because it uses interactivity (fetching data, state, charts).
"use client";

// Import necessary tools from React
import React, { useState, useEffect } from 'react';

// Import charting components from the libraries we installed
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

// Register the components Chart.js needs to draw the charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// This is the main function for our page component
export default function AdminAnalyticsPage() {
  // === STATE MANAGEMENT ===
  // Here we define the component's "memory".
  // 'data' will hold the analytics data from our API.
  // 'loading' will track if we are currently fetching data.
  // 'error' will store any error message if the fetch fails.
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // === DATA FETCHING ===
  // The 'useEffect' hook runs code after the component first renders.
  // It's the perfect place to fetch our initial data.
  useEffect(() => {
    // Define an async function to fetch data from our API endpoint
    const fetchData = async () => {
      try {
        setLoading(true); // Set loading to true before we start
        const response = await fetch('/api/analytics/admin'); // Call the API
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const apiResponse = await response.json();
        setData(apiResponse); // Store the successful response in our state
      } catch (err: any) {
        setError(err.message); // Store the error message in our state
      } finally {
        setLoading(false); // Set loading to false once we're done (success or fail)
      }
    };

    fetchData(); // Call the function to run it
  }, []); // The empty array [] means this effect runs only once on component load.

  // === LOADING AND ERROR STATES ===
  // Before we have data, we should show a loading or error message.
  if (loading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  }
  if (!data) {
    return <div className="p-6 text-center">No data available.</div>;
  }

  // === CHART DATA PREPARATION ===
  // We need to format the data from our API to match what the chart library expects.
  const sessionsChartData = {
    labels: data.sessionsOverTime.map((d: any) => d.date),
    datasets: [{
      label: 'Sessions',
      data: data.sessionsOverTime.map((d: any) => d.sessions),
      tension: 0.3,
      fill: true,
      backgroundColor: 'rgba(59,130,246,0.08)',
      borderColor: 'rgba(59,130,246,1)',
      pointRadius: 2,
    }],
  };

  const uniPieData = {
    labels: data.topUniversities.map((u: any) => u.name),
    datasets: [{
      data: data.topUniversities.map((u: any) => u.mentions),
      backgroundColor: ['#60a5fa', '#7dd3fc', '#34d399', '#fbbf24', '#c7d2fe'],
    }],
  };

  // === JSX (THE RENDERED HTML) ===
  // This is the final output. It's the original HTML, but with dynamic data
  // from our 'data' state variable instead of hardcoded values.
  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">AI Mentor — Analytics</h1>
          <p className="text-sm text-gray-500">Overview dashboard for mentees, mentors, universities & course insights</p>
        </div>
        {/* Filters can be implemented later */}
      </header>

      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-xs text-gray-400">Active Mentees</div>
          <div className="text-2xl font-bold">{data.kpis.activeMentees.current.toLocaleString()}</div>
          <div className={`text-sm ${data.kpis.activeMentees.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.kpis.activeMentees.change >= 0 ? '+' : ''}{data.kpis.activeMentees.change}% vs prev. period
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-xs text-gray-400">Sessions (chats/calls)</div>
          <div className="text-2xl font-bold">{data.kpis.totalSessions.current.toLocaleString()}</div>
          <div className={`text-sm ${data.kpis.totalSessions.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.kpis.totalSessions.change >= 0 ? '+' : ''}{data.kpis.totalSessions.change}% vs prev. period
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-xs text-gray-400">Conversion → Mentorship Paid</div>
          <div className="text-2xl font-bold">{data.kpis.paidConversionRate}%</div>
          <div className="text-sm text-gray-500">(from inquiries)</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-xs text-gray-400">Avg Session Rating</div>
          <div className="text-2xl font-bold">{data.kpis.averageSessionRating.toFixed(1)} / 5</div>
          <div className="text-sm text-gray-500">NPS & feedback</div>
        </div>
      </section>

      {/* Charts & Lists */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium">Traffic & Engagement</h3>
            <Line data={sessionsChartData} options={{ plugins: { legend: { display: false } } }} height={120} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-3">Top Mentee Questions (Mock Data)</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {data.topMenteeQuestions.map((q: any, i: number) => (
                <li key={i} className="p-2 border-b">
                  <div className="flex justify-between">
                    <div>{q.query}</div>
                    <div className="text-xs text-gray-400">{q.mentions} mentions</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Top Universities Searched (Mock Data)</h3>
            <Doughnut data={uniPieData} options={{ plugins: { legend: { position: 'bottom' } } }} height={200} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-2">Mentor Leaderboard</h3>
            <ol className="list-decimal pl-5 text-sm text-gray-700">
              {data.mentorLeaderboard.map((m: any) => (
                <li key={m.mentorId} className="mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.sessionsCompleted} sessions</div>
                    </div>
                    <div className="text-sm text-yellow-600">★ {m.averageRating.toFixed(1)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}