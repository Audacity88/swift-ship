'use client';

import { useState, useEffect } from 'react';
import { Article, ArticleStatus } from '@/types/knowledge';
import { ArticleRating } from '@/types/portal';
import { ArticleViewer } from '@/components/features/portal/ArticleViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, ChevronLeft, Share2, Star, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@/types/role';

interface ArticlePageProps {
  params: {
    id: string;
  };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [userRating, setUserRating] = useState<ArticleRating | undefined>(undefined);

  useEffect(() => {
    // In a real app, these would fetch from the API using params.id
    // Mock data for now
    setArticle({
      id: params.id,
      title: 'Example Article',
      content: 'This is the article content...',
      excerpt: 'A brief summary of the article',
      slug: 'example-article',
      categoryId: 'default',
      tags: [],
      author: {
        id: 'author-1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      metadata: {
        views: 1234,
        helpfulCount: 56,
        notHelpfulCount: 12,
        lastUpdated: new Date().toISOString()
      },
      status: ArticleStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    setRelatedArticles([
      {
        id: 'related-1',
        title: 'Related Article 1',
        excerpt: 'Related article description...',
        slug: 'related-article-1',
        categoryId: 'default',
        content: 'Related article content...',
        tags: [],
        author: {
          id: 'author-1',
          name: 'John Doe',
          email: 'john@example.com'
        },
        metadata: {
          views: 789,
          helpfulCount: 34,
          notHelpfulCount: 8,
          lastUpdated: new Date().toISOString()
        },
        status: ArticleStatus.PUBLISHED,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Add more mock related articles as needed
    ]);
  }, [params.id]);

  const handleRateArticle = async (rating: number, feedback?: string) => {
    // In a real app, this would call the API to submit the rating
    console.log('Rate article:', { rating, feedback });
    const newRating: ArticleRating = {
      id: 'rating-1',
      userId: 'user-1',
      articleId: params.id,
      rating,
      feedback,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setUserRating(newRating);
  };

  const handleBookmark = async () => {
    // In a real app, this would call the API to toggle bookmark
    console.log('Toggle bookmark');
  };

  const handleShare = async () => {
    // In a real app, this would open a share dialog
    console.log('Share article');
  };

  const handleNavigateToArticle = (articleId: string) => {
    // In a real app, this would navigate to the article
    console.log('Navigate to article:', articleId);
  };

  if (!article) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr,300px]">
        <div className="space-y-8">
          <div>
            <Link href="/portal" className="inline-flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">{article.title}</h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                {article.metadata.views} views
              </span>
              <span className="flex items-center">
                <ThumbsUp className="mr-2 h-4 w-4" />
                {article.metadata.helpfulCount} found this helpful
              </span>
              <span>
                Updated {new Date(article.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <Separator />

          <ArticleViewer
            article={article}
            relatedArticles={relatedArticles}
            userRating={userRating}
            onRate={handleRateArticle}
            onBookmark={handleBookmark}
            onShare={handleShare}
            onNavigateToArticle={handleNavigateToArticle}
            onBack={() => window.history.back()}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Related Articles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  href={`/portal/articles/${relatedArticle.id}`}
                  className="block"
                >
                  <div className="space-y-1 hover:text-primary">
                    <h3 className="font-medium line-clamp-2">
                      {relatedArticle.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {relatedArticle.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleBookmark}
              >
                <Star className="mr-2 h-4 w-4" />
                Bookmark Article
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Article
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 