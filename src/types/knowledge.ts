import { User } from './user';

// Article status types
export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

// Article version interface
export interface ArticleVersion {
  id: string;
  articleId: string;
  version: number;
  content: string;
  changes: string;
  createdAt: Date;
  createdBy: User;
}

// Article metadata interface
export interface ArticleMetadata {
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  lastUpdated: string;
}

// Main article interface
export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  status: ArticleStatus;
  categoryId: string;
  tags: string[];
  author: {
    id: string;
    name: string;
    email: string;
  };
  metadata: {
    views: number;
    helpfulCount: number;
    notHelpfulCount: number;
    lastUpdated: string;
  };
  highlight?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category interfaces
export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  order: number;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

// Search types
export interface SearchFilters {
  categoryId?: string;
  status?: ArticleStatus;
  tags?: string[];
  authorId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SearchResult {
  article: Article;
  relevance: number;
  highlights: {
    field: string;
    snippet: string;
  }[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  filters: SearchFilters;
}

// Article feedback interface
export interface ArticleFeedback {
  id: string;
  articleId: string;
  userId?: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: Date;
}

// Article analytics interface
export interface ArticleAnalytics extends ArticleMetadata {
  id: string;
  articleId: string;
  periodStart: Date;
  periodEnd: Date;
  uniqueViews: number;
  averageTimeSpent: number;
  searchImpressions: number;
  searchClicks: number;
  conversionRate: number;
} 