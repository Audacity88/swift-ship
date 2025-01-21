'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article, Category, SearchFilters, SearchResult } from '@/types/knowledge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command } from 'cmdk';
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { CalendarIcon, Search, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface SearchInterfaceProps {
  onSearch: (query: string, filters: SearchFilters) => Promise<SearchResult[]>;
  categories: Category[];
  recentSearches?: string[];
  popularArticles?: Article[];
  className?: string;
}

export const SearchInterface = ({
  onSearch,
  categories,
  recentSearches = [],
  popularArticles = [],
  className,
}: SearchInterfaceProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const searchResults = await onSearch(searchQuery, {
        ...filters,
        dateRange: dateRange?.from && dateRange?.to ? {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString(),
        } : undefined,
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters, dateRange, onSearch]);

  useEffect(() => {
    if (searchQuery) {
      const delayDebounceFn = setTimeout(() => {
        void handleSearch();
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setResults([]);
    }
  }, [searchQuery, handleSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setDateRange(undefined);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col space-y-4">
        <div className="relative">
          <Command className="rounded-lg border shadow-md">
            <CommandInput
              placeholder="Search articles..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && (searchQuery || recentSearches.length > 0) && (
              <Command.List>
                {searchQuery && (
                  <CommandGroup heading="Suggestions">
                    <CommandItem
                      onSelect={() => {
                        setSearchQuery(searchQuery);
                        handleSearch();
                        setShowSuggestions(false);
                      }}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Search for &quot;{searchQuery}&quot;
                    </CommandItem>
                  </CommandGroup>
                )}
                {recentSearches.length > 0 && (
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.map((term) => (
                      <CommandItem
                        key={term}
                        onSelect={() => {
                          setSearchQuery(term);
                          handleSearch();
                          setShowSuggestions(false);
                        }}
                      >
                        {term}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandEmpty>No results found.</CommandEmpty>
              </Command.List>
            )}
          </Command>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.categoryId}
            onValueChange={(value) => handleFilterChange('categoryId', value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !dateRange?.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange?.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} -{' '}
                      {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {(Object.keys(filters).length > 0 || dateRange?.from) && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-10"
            >
              Clear Filters
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.article.id}>
              <CardHeader>
                <CardTitle>{result.article.title}</CardTitle>
                <CardDescription>
                  {categories.find(c => c.id === result.article.categoryId)?.name}
                  <span className="mx-2">•</span>
                  Updated {format(new Date(result.article.updatedAt), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {result.article.excerpt}
                </p>
                {result.highlights.map((highlight, i) => (
                  <Badge key={i} variant="secondary" className="ml-2">
                    {highlight}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchQuery && !isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>No results found</CardTitle>
            <CardDescription>
              Try adjusting your search or filters to find what you're looking for
            </CardDescription>
          </CardHeader>
        </Card>
      ) : popularArticles.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Popular Articles</h3>
          {popularArticles.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <CardTitle>{article.title}</CardTitle>
                <CardDescription>
                  {categories.find(c => c.id === article.categoryId)?.name}
                  <span className="mx-2">•</span>
                  Updated {format(new Date(article.updatedAt), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {article.excerpt}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}; 