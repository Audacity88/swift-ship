import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchService } from '@/lib/services/search-service';
import { SearchFilters } from '@/types/search';
import { Article } from '@/types/knowledge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { useUser } from '@/hooks/useUser';

interface SearchBarProps {
  onSearch: (items: Article[]) => void;
  filters?: SearchFilters;
  className?: string;
}

export const SearchBar = ({ onSearch, filters, className = '' }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const { user } = useUser();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Fetch search suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await searchService.getSearchSuggestions(debouncedQuery);
        if (mounted.current) {
          setSuggestions(results);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Handle search submission
  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim() || !user) return;

    setIsLoading(true);
    try {
      const result = await searchService.searchArticles(
        searchQuery,
        filters || {},
        user.id,
        user.type
      );
      if (mounted.current) {
        onSearch(result.items);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <Combobox
          value={query}
          items={suggestions}
          onChange={setQuery}
          onSelect={handleSelect}
          placeholder="Search knowledge base..."
          className="flex-1"
          renderInput={(props) => (
            <Input
              {...props}
              type="search"
              className="w-full"
              aria-label="Search knowledge base"
            />
          )}
        />
        <Button
          onClick={() => handleSearch()}
          disabled={isLoading || !query.trim()}
          aria-label="Search"
        >
          {isLoading ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <span>Search</span>
          )}
        </Button>
      </div>
    </div>
  );
}; 