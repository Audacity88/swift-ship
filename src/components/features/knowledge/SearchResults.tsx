import { Article } from '@/types/knowledge';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SearchResultsProps {
  results: Article[];
  className?: string;
}

export const SearchResults = ({ results, className = '' }: SearchResultsProps) => {
  if (results.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">No results found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {results.map((article) => (
        <Card
          key={article.id}
          className="p-4 hover:shadow-md transition-shadow"
        >
          <Link
            href={`/knowledge/articles/${article.id}`}
            className="block space-y-2"
          >
            <h3 className="text-lg font-semibold hover:text-primary">
              {article.title}
            </h3>
            
            {article.excerpt && (
              <p className="text-muted-foreground text-sm">
                {article.excerpt}
              </p>
            )}

            {/* Display highlighted content if available */}
            {article.highlight && (
              <div 
                className="text-sm mt-2"
                dangerouslySetInnerHTML={{ __html: article.highlight }}
              />
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {article.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              Last updated: {new Date(article.updatedAt).toLocaleDateString()}
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}; 