'use client';

import { useState } from 'react';
import { Article } from '@/types/knowledge';
import { SearchBar } from '@/components/features/knowledge/SearchBar';
import { SearchResults } from '@/components/features/knowledge/SearchResults';
import { Card } from '@/components/ui/card';

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (results: Article[]) => {
    setSearchResults(results);
    setHasSearched(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Search Knowledge Base
        </h1>

        <Card className="p-4">
          <SearchBar
            onSearch={handleSearch}
            className="mb-4"
          />

          {hasSearched && (
            <div className="mt-6">
              <SearchResults results={searchResults} />
            </div>
          )}

          {!hasSearched && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Enter a search term to find articles</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 