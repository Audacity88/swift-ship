'use client';

import { useState, useEffect } from 'react';
import { Article, ArticleStatus } from '@/types/knowledge';
import { SearchBar } from '@/components/features/portal/SearchBar';
import { Button } from '@/components/ui/button';
import { knowledgeService } from '@/lib/services';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileText, TicketPlus, User, Search } from 'lucide-react';
import Link from 'next/link';

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

export default function PortalHome() {
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        // Fetch featured articles (published status)
        const { articles: featured } = await knowledgeService.getArticles(1, 6, {
          status: ArticleStatus.PUBLISHED,
          sort: { field: 'highlight', direction: 'desc' }
        });
        setFeaturedArticles(featured);

        // Fetch popular articles (sort by view count)
        const { articles: popular } = await knowledgeService.getArticles(1, 6, {
          status: ArticleStatus.PUBLISHED,
          sort: { field: 'metadata->views', direction: 'desc' }
        });
        setPopularArticles(popular);

        // Fetch recent articles
        const { articles: recent } = await knowledgeService.getArticles(1, 6, {
          status: ArticleStatus.PUBLISHED,
          sort: { field: 'updated_at', direction: 'desc' }
        });
        setRecentArticles(recent);

        // Get recent searches from localStorage
        const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        setRecentSearches(searches);
      } catch (error) {
        console.error('Error fetching portal data:', error);
      }
    };

    fetchArticles();
  }, []);

  // In a real app, these would be fetched from the API
  const quickLinks: QuickLink[] = [
    {
      title: 'Submit a Ticket',
      description: 'Get help from our support team',
      href: '/portal/tickets/new',
      icon: <TicketPlus className="h-6 w-6" />,
    },
    {
      title: 'Browse Articles',
      description: 'Explore our knowledge base',
      href: '/portal/articles',
      icon: <FileText className="h-6 w-6" />,
    },
    {
      title: 'Search',
      description: 'Find specific articles or topics',
      href: '/portal/search',
      icon: <Search className="h-6 w-6" />,
    },
    {
      title: 'Your Profile',
      description: 'Manage your account settings',
      href: '/portal/profile',
      icon: <User className="h-6 w-6" />,
    },
  ];

  const handleSearch = async (query: string): Promise<Article[]> => {
    try {
      const results = await knowledgeService.searchArticles(query);
      // Save search to localStorage
      const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      localStorage.setItem('recentSearches', JSON.stringify([query, ...searches].slice(0, 5)));
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  };

  const handleSelectArticle = async (articleId: string) => {
    try {
      // Track article view
      await knowledgeService.trackArticleView(articleId);
    } catch (error) {
      console.error('Error tracking article view:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">How can we help you today?</h1>
        <div className="max-w-2xl mx-auto">
          <SearchBar
            onSearch={handleSearch}
            recentSearches={recentSearches}
            popularArticles={popularArticles}
            onSelectArticle={handleSelectArticle}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  {link.icon}
                  <div>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Tabs defaultValue="featured" className="space-y-4">
        <TabsList>
          <TabsTrigger value="featured">Featured Articles</TabsTrigger>
          <TabsTrigger value="popular">Most Popular</TabsTrigger>
          <TabsTrigger value="recent">Recently Updated</TabsTrigger>
        </TabsList>
        <TabsContent value="featured">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article) => (
              <Link key={article.id} href={`/portal/articles/${article.id}`}>
                <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {article.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {article.metadata?.views || 0} views
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="popular">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {popularArticles.map((article) => (
              <Link key={article.id} href={`/portal/articles/${article.id}`}>
                <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {article.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {article.metadata?.views || 0} views
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="recent">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentArticles.map((article) => (
              <Link key={article.id} href={`/portal/articles/${article.id}`}>
                <Card className="h-full hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {article.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {article.metadata?.views || 0} views
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 