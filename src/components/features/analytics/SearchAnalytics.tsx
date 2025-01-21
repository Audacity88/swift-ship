import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchAnalytics as SearchAnalyticsType, FailedSearch } from '@/types/search';
import { supabase } from '@/lib/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface SearchMetrics {
  totalSearches: number;
  averageResponseTime: number;
  failureRate: number;
  topSearchTerms: { term: string; count: number }[];
  searchesByDay: { date: string; count: number }[];
  failedSearches: FailedSearch[];
}

export const SearchAnalytics = () => {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        // Get total searches and average response time
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_search_analytics', { time_range: timeRange });
        
        if (analyticsError) throw analyticsError;

        // Get top search terms
        const { data: topTermsData, error: topTermsError } = await supabase
          .rpc('get_top_search_terms', { time_range: timeRange, limit: 10 });

        if (topTermsError) throw topTermsError;

        // Get searches by day
        const { data: searchesByDayData, error: searchesByDayError } = await supabase
          .rpc('get_searches_by_day', { time_range: timeRange });

        if (searchesByDayError) throw searchesByDayError;

        // Get recent failed searches
        const { data: failedSearchesData, error: failedSearchesError } = await supabase
          .from('failed_searches')
          .select('*')
          .gte('created_at', new Date(Date.now() - getTimeRangeInMs(timeRange)).toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        if (failedSearchesError) throw failedSearchesError;

        setMetrics({
          totalSearches: analyticsData.total_searches,
          averageResponseTime: Math.round(analyticsData.avg_response_time),
          failureRate: analyticsData.failure_rate,
          topSearchTerms: topTermsData,
          searchesByDay: searchesByDayData,
          failedSearches: failedSearchesData
        });
      } catch (error) {
        console.error('Failed to fetch search metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

  const getTimeRangeInMs = (range: '7d' | '30d' | '90d') => {
    const days = parseInt(range);
    return days * 24 * 60 * 60 * 1000;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load search analytics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Search Analytics</h2>
        <div className="space-x-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as '7d' | '30d' | '90d')}
              className={`px-3 py-1 rounded ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">{metrics.totalSearches}</div>
          <div className="text-sm text-muted-foreground">Total Searches</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{metrics.averageResponseTime}ms</div>
          <div className="text-sm text-muted-foreground">Average Response Time</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{metrics.failureRate}%</div>
          <div className="text-sm text-muted-foreground">Failed Searches Rate</div>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Search Trends</TabsTrigger>
          <TabsTrigger value="terms">Top Terms</TabsTrigger>
          <TabsTrigger value="failures">Failed Searches</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-6">
          <Card className="p-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.searchesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-6">
          <Card className="p-4">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topSearchTerms}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="term" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="failures" className="mt-6">
          <Card className="p-4">
            <div className="space-y-4">
              {metrics.failedSearches.map((search, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="font-medium">{search.query}</div>
                  <div className="text-sm text-muted-foreground">
                    {search.errorMessage}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(search.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 