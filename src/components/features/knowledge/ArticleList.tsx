'use client';

import { useState } from 'react';
import { Article, ArticleStatus, Category } from '@/types/knowledge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Eye, MoreVertical, Pencil, Archive, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleListProps {
  articles: Article[];
  categories: Category[];
  onView: (article: Article) => void;
  onEdit: (article: Article) => void;
  onArchive: (article: Article) => void;
  className?: string;
}

export const ArticleList = ({
  articles: initialArticles,
  categories,
  onView,
  onEdit,
  onArchive,
  className,
}: ArticleListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<ArticleStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'views'>('date');

  const filteredArticles = initialArticles
    .filter((article) => {
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || article.categoryId === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || article.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return (b.metadata.views || 0) - (a.metadata.views || 0);
    });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select
          value={selectedCategory}
          onValueChange={setSelectedCategory}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as ArticleStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={ArticleStatus.PUBLISHED}>Published</SelectItem>
            <SelectItem value={ArticleStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={ArticleStatus.ARCHIVED}>Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as 'date' | 'views')}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Last Updated</SelectItem>
            <SelectItem value="views">Most Viewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                  <CardDescription>
                    {categories.find(c => c.id === article.categoryId)?.name}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(article)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(article)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onArchive(article)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {article.excerpt}
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Eye className="mr-1 h-4 w-4" />
                  {article.metadata.views || 0}
                  <Star className="ml-4 mr-1 h-4 w-4" />
                  {article.metadata.helpfulCount || 0}
                </div>
                <span>
                  Updated {format(new Date(article.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No articles found matching your criteria.
        </div>
      )}
    </div>
  );
}; 