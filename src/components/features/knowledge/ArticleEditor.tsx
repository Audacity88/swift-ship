'use client';

import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveArticle, publishArticle } from '@/lib/services/knowledge-service'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Article, Category, ArticleStatus } from '@/types/knowledge'

const lowlight = createLowlight(common);

interface Author {
  id: string
  name: string
}

interface ArticleEditorProps {
  article: Article
  categories?: Category[]
}

const ArticleEditor: React.FC<ArticleEditorProps> = ({ article: initialArticle, categories = [] }) => {
  const [article, setArticle] = useState(initialArticle)
  const [isPreview, setIsPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArticle(prev => ({ ...prev, title: e.target.value }))
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setArticle(prev => ({ ...prev, content: e.target.value }))
  }

  const handleCategoryChange = (value: string) => {
    setArticle(prev => ({ ...prev, categoryId: value }))
  }

  const validateArticle = () => {
    if (!article.title.trim()) {
      setError('Title is required')
      return false
    }
    if (!article.content.trim()) {
      setError('Content is required')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateArticle()) return

    setIsSaving(true)
    setError(null)

    try {
      await saveArticle(article)
    } catch (err) {
      setError('Failed to save article')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!validateArticle()) return

    setIsSaving(true)
    setError(null)

    try {
      await publishArticle(article)
      setArticle(prev => ({ ...prev, status: ArticleStatus.PUBLISHED }))
    } catch (err) {
      setError('Failed to publish article')
    } finally {
      setIsSaving(false)
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false // Disable codeBlock from StarterKit to avoid duplicate
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: article.content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none focus:outline-none',
          'prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
          'prose-p:text-gray-700 dark:prose-p:text-gray-300',
          'prose-a:text-primary',
          'prose-code:text-primary prose-code:bg-muted prose-code:rounded prose-code:px-1',
          'prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 prose-blockquote:border-l-primary',
          'prose-img:rounded-lg',
        ),
      },
    },
    onUpdate: ({ editor }) => {
      setArticle(prev => ({ ...prev, content: editor.getHTML() }))
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const url = window.prompt('Enter URL');
    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <Input
          id="title"
          value={article.title}
          onChange={handleTitleChange}
          className="mt-1"
          aria-label="title"
        />
      </div>

      {categories.length > 0 && (
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <Select value={article.categoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger className="mt-1" aria-label="category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          Content
        </label>
        {isPreview ? (
          <div className="mt-1 prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
        ) : (
          <Textarea
            id="content"
            value={article.content}
            onChange={handleContentChange}
            className="mt-1"
            rows={10}
            aria-label="content"
          />
        )}
      </div>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={isSaving}>
          Save
        </Button>
        <Button onClick={handlePublish} disabled={isSaving}>
          Publish
        </Button>
        <Button onClick={() => setIsPreview(!isPreview)} variant="outline">
          {isPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
    </div>
  )
}

export default ArticleEditor 