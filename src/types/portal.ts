import { User } from './user';
import { Article } from './knowledge';
import { Ticket } from './ticket';

// Customer profile interface
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  jobTitle?: string;
  timezone: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

// Portal preferences interface
export interface PortalPreferences {
  emailNotifications: {
    ticketUpdates: boolean;
    articleUpdates: boolean;
    newsletter: boolean;
  };
  displayPreferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    articlesPerPage: number;
  };
  categorySubscriptions: string[];
}

// Article interaction types
export interface ArticleInteraction {
  id: string;
  userId: string;
  articleId: string;
  type: 'view' | 'bookmark' | 'share';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ArticleRating {
  id: string;
  userId: string;
  articleId: string;
  rating: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Portal activity interface
export interface PortalActivity {
  id: string;
  userId: string;
  type: 'article_view' | 'ticket_created' | 'ticket_updated' | 'profile_updated' | 'feedback_submitted';
  metadata: {
    articleId?: string;
    ticketId?: string;
    details?: string;
  };
  createdAt: Date;
}

// Portal session interface
export interface PortalSession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  device: {
    type: string;
    browser: string;
    os: string;
  };
  activities: PortalActivity[];
}

// Customer support history
export interface CustomerSupportHistory {
  userId: string;
  tickets: Ticket[];
  articleInteractions: ArticleInteraction[];
  totalTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  lastTicketCreated?: Date;
  mostViewedArticles: Article[];
}

// Portal analytics
export interface PortalAnalytics {
  id: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    activeUsers: number;
    newUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    articleViews: number;
    searchQueries: number;
    ticketsCreated: number;
    selfServiceRate: number;
  };
  topArticles: Array<{
    articleId: string;
    views: number;
    rating: number;
  }>;
  topSearchTerms: Array<{
    term: string;
    count: number;
    successRate: number;
  }>;
}

export interface CustomerPreferences {
  emailNotifications: boolean;
  articleUpdates: boolean;
  ticketUpdates: boolean;
  newsletter: boolean;
  language: string;
  timezone: string;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters?: Record<string, any>;
  resultCount: number;
  createdAt: Date;
}

export interface ArticleViewerProps {
  article: Article;
  relatedArticles: Article[];
  userRating?: ArticleRating;
  onRate: (rating: number, feedback?: string) => Promise<void>;
  onBookmark: () => Promise<void>;
  onShare: () => Promise<void>;
  onNavigateToArticle: (articleId: string) => void;
  onBack?: () => void;
}

export interface SearchBarProps {
  onSearch: (query: string) => Promise<Article[]>;
  recentSearches: string[];
  popularArticles: Article[];
  onSelectArticle: (articleId: string) => void;
  onClearRecentSearches?: () => void;
  className?: string;
} 