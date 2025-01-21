'use client';

import { useState, useEffect } from 'react';
import { Article } from '@/types/knowledge';
import { Command } from 'cmdk';
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Clock,
  Eye,
  Search,
  Star,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => Promise<Article[]>;
  recentSearches?: string[];
  popularArticles?: Article[];
  onSelectArticle: (articleId: string) => void;
  onClearRecentSearches?: () => void;
  className?: string;
}

export const SearchBar = ({
  onSearch,
  recentSearches = [],
  popularArticles = [],
  onSelectArticle,
  onClearRecentSearches,
  className,
}: SearchBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        try {
          const results = await onSearch(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    };

    const debounceSearch = setTimeout(search, 300);
    return () => clearTimeout(debounceSearch);
  }, [searchQuery, onSearch]);

  const handleSelect = (articleId: string) => {
    onSelectArticle(articleId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-start text-muted-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            {searchQuery || 'Search knowledge base...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[clamp(300px,calc(100vw-2rem),800px)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <Command.List>
              <ScrollArea className="h-[400px]">
                {isLoading ? (
                  <CommandEmpty>Searching...</CommandEmpty>
                ) : searchResults.length > 0 ? (
                  <CommandGroup heading="Search Results">
                    {searchResults.map((article) => (
                      <CommandItem
                        key={article.id}
                        onSelect={() => handleSelect(article.id)}
                        className="flex items-start justify-between p-2"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{article.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {article.excerpt}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Eye className="mr-1 h-3 w-3" />
                              {article.metadata.views} views
                            </span>
                            <span className="flex items-center">
                              <Star className="mr-1 h-3 w-3" />
                              {article.metadata.helpfulCount} helpful
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : searchQuery ? (
                  <CommandEmpty>No results found.</CommandEmpty>
                ) : (
                  <>
                    {recentSearches.length > 0 && (
                      <CommandGroup heading="Recent Searches">
                        {recentSearches.map((term, index) => (
                          <CommandItem
                            key={index}
                            onSelect={() => setSearchQuery(term)}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {term}
                          </CommandItem>
                        ))}
                        {onClearRecentSearches && (
                          <CommandItem
                            onSelect={onClearRecentSearches}
                            className="text-muted-foreground italic"
                          >
                            Clear recent searches
                          </CommandItem>
                        )}
                      </CommandGroup>
                    )}
                    {popularArticles.length > 0 && (
                      <CommandGroup heading="Popular Articles">
                        {popularArticles.map((article) => (
                          <CommandItem
                            key={article.id}
                            onSelect={() => handleSelect(article.id)}
                            className="flex items-start justify-between p-2"
                          >
                            <div className="flex-1">
                              <div className="flex items-center">
                                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                                <h4 className="font-medium">{article.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {article.excerpt}
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                <span>
                                  Updated {format(new Date(article.updatedAt), 'MMM d, yyyy')}
                                </span>
                                <span className="flex items-center">
                                  <Eye className="mr-1 h-3 w-3" />
                                  {article.metadata.views} views
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 ml-2 flex-shrink-0" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
                )}
              </ScrollArea>
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}; 