'use client';

import { useState } from 'react';
import { Article, ArticleStatus, Category } from '@/types/knowledge';
import ArticleEditor from '@/components/features/knowledge/ArticleEditor';
import { ArticleList } from '@/components/features/knowledge/ArticleList';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Plus } from 'lucide-react';

const articleFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  categoryId: z.string().min(1, 'Category is required'),
  excerpt: z.string().min(1, 'Excerpt is required'),
  content: z.string().min(1, 'Content is required'),
  status: z.nativeEnum(ArticleStatus),
});

type ArticleFormValues = z.infer<typeof articleFormSchema>;

const defaultArticle: Article = {
  id: '',
  title: '',
  content: '',
  excerpt: '',
  slug: '',
  categoryId: '',
  status: ArticleStatus.DRAFT,
  tags: [],
  author: {
    id: '',
    name: '',
    email: ''
  },
  metadata: {
    views: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    lastUpdated: new Date().toISOString()
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

export default function ArticlesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      categoryId: '',
      excerpt: '',
      content: '',
      status: ArticleStatus.DRAFT,
    },
  });

  const onSubmit = async (values: ArticleFormValues) => {
    // In a real app, this would call the KnowledgeService to create/update the article
    console.log(values);
    setIsCreateDialogOpen(false);
    form.reset();
  };

  const handleViewArticle = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleEditArticle = (article: Article) => {
    setSelectedArticle(article);
    form.reset({
      title: article.title,
      slug: article.slug,
      categoryId: article.categoryId,
      excerpt: article.excerpt,
      content: article.content,
      status: article.status,
    });
    setIsCreateDialogOpen(true);
  };

  const handleArchiveArticle = async (article: Article) => {
    // In a real app, this would call the KnowledgeService to archive the article
    console.log('Archive article:', article.id);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">
            Create and manage your knowledge base articles
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
              <DialogDescription>
                {selectedArticle
                  ? 'Edit the article details and content below'
                  : 'Fill in the article details and content below'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          URL-friendly version of the title
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={ArticleStatus.DRAFT}>Draft</SelectItem>
                            <SelectItem value={ArticleStatus.PUBLISHED}>Published</SelectItem>
                            <SelectItem value={ArticleStatus.ARCHIVED}>Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        A brief summary of the article
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <ArticleEditor 
                          article={{
                            ...defaultArticle,
                            content: field.value
                          }}
                          categories={categories}
                          onChange={field.onChange}
                          className="min-h-[400px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedArticle ? 'Update Article' : 'Create Article'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <ArticleList
        articles={articles}
        categories={categories}
        onView={handleViewArticle}
        onEdit={handleEditArticle}
        onArchive={handleArchiveArticle}
      />
    </div>
  );
} 