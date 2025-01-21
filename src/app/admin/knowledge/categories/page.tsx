'use client';

import { useState } from 'react';
import { Category } from '@/types/knowledge';
import { CategoryManager } from '@/components/features/knowledge/CategoryManager';
import { KnowledgeService } from '@/lib/services/knowledge-service';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  const handleCreateCategory = async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    // In a real app, this would call the KnowledgeService to create the category
    console.log('Create category:', category);
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    // In a real app, this would call the KnowledgeService to update the category
    console.log('Update category:', id, updates);
  };

  const handleDeleteCategory = async (id: string) => {
    // In a real app, this would call the KnowledgeService to delete the category
    console.log('Delete category:', id);
  };

  const handleReorderCategories = async (orderedIds: string[]) => {
    // In a real app, this would call the KnowledgeService to reorder categories
    console.log('Reorder categories:', orderedIds);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          Organize your knowledge base with categories and subcategories
        </p>
      </div>

      <CategoryManager
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onReorderCategories={handleReorderCategories}
      />
    </div>
  );
} 