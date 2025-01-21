'use client';

import { useState, useEffect } from 'react';
import { Article } from '@/types/knowledge';
import { SearchBar } from '@/components/features/portal/SearchBar';
import { Button } from '@/components/ui/button';
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
    // In a real app, this would navigate to the search page with the query
    console.log('Search:', query);
    return [];
  };

  const handleSelectArticle = (articleId: string) => {
    // In a real app, this would navigate to the article page
    console.log('Selected article:', articleId);
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
        {['featured', 'popular', 'recent'].map((tab) => (
          <TabsContent key={tab} value={tab}>
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
                        {article.metadata.views} views
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 