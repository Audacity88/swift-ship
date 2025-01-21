'use client';

import { useState } from 'react';
import { Article, ArticleStatus, Category } from '@/types/knowledge';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays } from 'date-fns';
import {
  BookOpen,
  TrendingUp,
  Users,
  Star,
  FileText,
  Archive,
  PenTool,
} from 'lucide-react';

interface DashboardMetrics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  archivedArticles: number;
  totalViews: number;
  averageRating: number;
  totalAuthors: number;
  categoryDistribution: {
    categoryId: string;
    categoryName: string;
    count: number;
  }[];
  viewsOverTime: {
    date: string;
    views: number;
  }[];
  popularArticles: Article[];
}

export default function KnowledgeBaseDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    archivedArticles: 0,
    totalViews: 0,
    averageRating: 0,
    totalAuthors: 0,
    categoryDistribution: [],
    viewsOverTime: [],
    popularArticles: [],
  });

  // In a real app, this would fetch actual data from the KnowledgeService
  // For now, we'll use mock data
  const mockData = {
    totalArticles: 156,
    publishedArticles: 124,
    draftArticles: 18,
    archivedArticles: 14,
    totalViews: 15678,
    averageRating: 4.2,
    totalAuthors: 12,
    categoryDistribution: [
      { categoryId: '1', categoryName: 'Getting Started', count: 25 },
      { categoryId: '2', categoryName: 'Features', count: 45 },
      { categoryId: '3', categoryName: 'Troubleshooting', count: 30 },
      { categoryId: '4', categoryName: 'API Reference', count: 35 },
      { categoryId: '5', categoryName: 'Best Practices', count: 21 },
    ],
    viewsOverTime: Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), 'MMM dd'),
      views: Math.floor(Math.random() * 200) + 100,
    })),
    popularArticles: Array.from({ length: 5 }, (_, i) => ({
      id: `article-${i + 1}`,
      title: `Popular Article ${i + 1}`,
      excerpt: 'This is a popular article that gets a lot of views...',
      metadata: {
        views: Math.floor(Math.random() * 1000) + 500,
        helpfulCount: Math.floor(Math.random() * 100) + 50,
      },
      status: ArticleStatus.PUBLISHED,
      updatedAt: new Date(),
    } as Article)),
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your knowledge base performance and content metrics
          </p>
        </div>
        <Select
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as typeof timeRange)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.totalArticles}</div>
            <div className="flex space-x-4 text-sm text-muted-foreground">
              <span>{mockData.publishedArticles} published</span>
              <span>{mockData.draftArticles} drafts</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.averageRating.toFixed(1)}/5.0</div>
            <p className="text-xs text-muted-foreground">
              Based on {mockData.totalViews} ratings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Authors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockData.totalAuthors}</div>
            <p className="text-xs text-muted-foreground">
              Contributors this month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="popular">Popular Articles</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Views Over Time</CardTitle>
              <CardDescription>Daily article views for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockData.viewsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Number of articles per category</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData.categoryDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoryName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Articles</CardTitle>
              <CardDescription>Articles with the highest view counts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.popularArticles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <h3 className="font-medium">{article.title}</h3>
                      <div className="flex space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <BookOpen className="mr-1 h-4 w-4" />
                          {article.metadata.views} views
                        </span>
                        <span className="flex items-center">
                          <Star className="mr-1 h-4 w-4" />
                          {article.metadata.helpfulCount} helpful
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 