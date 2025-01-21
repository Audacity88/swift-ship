'use client';

import { useState } from 'react';
import { Article } from '@/types/knowledge';
import { ArticleRating } from '@/types/portal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  BookmarkIcon,
  ChevronLeft,
  Eye,
  MessageSquare,
  Share2,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

interface ArticleViewerProps {
  article: Article;
  relatedArticles?: Article[];
  userRating?: ArticleRating;
  onRate: (rating: number, feedback?: string) => Promise<void>;
  onBookmark: () => Promise<void>;
  onShare: () => Promise<void>;
  onNavigateToArticle: (articleId: string) => void;
  onBack: () => void;
  isBookmarked?: boolean;
  className?: string;
}

export const ArticleViewer = ({
  article,
  relatedArticles = [],
  userRating,
  onRate,
  onBookmark,
  onShare,
  onNavigateToArticle,
  onBack,
  isBookmarked = false,
  className,
}: ArticleViewerProps) => {
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleRate = async (helpful: boolean) => {
    if (!showFeedbackForm) {
      await onRate(helpful ? 5 : 1);
    } else {
      setIsRatingDialogOpen(true);
    }
  };

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true);
    try {
      await onRate(showFeedbackForm ? 1 : 5, feedback);
      setFeedback('');
      setIsRatingDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <Button
        variant="ghost"
        className="mb-4"
        onClick={onBack}
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Articles
      </Button>

      <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2">{article.title}</h1>
            <div className="flex items-center text-sm text-muted-foreground">
              <span>Updated {format(new Date(article.updatedAt), 'MMM d, yyyy')}</span>
              <span className="mx-2">•</span>
              <Eye className="h-4 w-4 mr-1" />
              <span>{article.metadata.views} views</span>
              <span className="mx-2">•</span>
              <Star className="h-4 w-4 mr-1" />
              <span>{article.metadata.helpfulCount} found this helpful</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBookmark}
              className={cn(isBookmarked && 'text-primary')}
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          className="mt-6"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Was this article helpful?</h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => handleRate(true)}
              className={cn(
                userRating?.rating === 5 && 'bg-primary/10 border-primary text-primary'
              )}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Yes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackForm(true);
                handleRate(false);
              }}
              className={cn(
                userRating?.rating === 1 && 'bg-primary/10 border-primary text-primary'
              )}
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              No
            </Button>
          </div>
        </div>
      </article>

      {relatedArticles.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Related Articles</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedArticles.map((relatedArticle) => (
              <Card
                key={relatedArticle.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onNavigateToArticle(relatedArticle.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{relatedArticle.title}</CardTitle>
                  <CardDescription>
                    {format(new Date(relatedArticle.updatedAt), 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {relatedArticle.excerpt}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Help us improve this article by providing more details about what could be better.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              placeholder="What could be improved?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRatingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={isSubmitting}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 