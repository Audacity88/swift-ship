import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArticleEditor from '@/components/features/knowledge/ArticleEditor'
import { Article, ArticleStatus, Category } from '@/types/knowledge'
import { knowledgeService } from '@/lib/services'

// Mock data
const mockArticle: Article = {
  id: '1',
  title: 'Test Article',
  content: '# Test Content\n\nThis is a test article.',
  excerpt: 'This is a test article.',
  slug: 'test-article',
  categoryId: 'cat1',
  status: ArticleStatus.DRAFT,
  tags: [],
  author: {
    id: 'auth1',
    name: 'Test Author',
    email: 'test@example.com'
  },
  metadata: {
    views: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    lastUpdated: new Date().toISOString()
  },
  createdAt: new Date('2024-01-21T08:00:00Z'),
  updatedAt: new Date('2024-01-21T08:00:00Z'),
}

const mockCategories: Category[] = [
  { 
    id: 'cat1', 
    name: 'Category 1', 
    order: 1, 
    description: 'Test Category 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 'cat2', 
    name: 'Category 2', 
    order: 2,
    description: 'Test Category 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
]

jest.mock('@/lib/services', () => ({
  knowledgeService: { createArticle: jest.fn(), updateArticle: jest.fn() },
}))

const mockCreateArticle = knowledgeService.createArticle as jest.Mock
const mockUpdateArticle = knowledgeService.updateArticle as jest.Mock

describe('ArticleEditor Component', () => {
  // Radix uses these browser APIs; jsdom does not implement them.
  beforeAll(() => {
    HTMLElement.prototype.hasPointerCapture ??= () => false
    HTMLElement.prototype.setPointerCapture ??= () => {}
    HTMLElement.prototype.releasePointerCapture ??= () => {}
    HTMLElement.prototype.scrollIntoView ??= () => {}
  })
  beforeEach(() => {
    mockCreateArticle.mockResolvedValue({ ...mockArticle, id: 'created-id' })
    mockUpdateArticle.mockResolvedValue(true)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders editor with article data', () => {
    render(<ArticleEditor article={mockArticle} />)

    expect(screen.getByDisplayValue('Test Article')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/# Test Content/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument()
  })

  it('handles title changes', async () => {
    render(<ArticleEditor article={mockArticle} />)

    const titleInput = screen.getByLabelText(/title/i)
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'New Title')

    expect(titleInput).toHaveValue('New Title')
  })

  it('handles content changes', async () => {
    render(<ArticleEditor article={mockArticle} />)

    const contentEditor = screen.getByLabelText(/content/i)
    await userEvent.clear(contentEditor)
    await userEvent.type(contentEditor, 'New Content')

    expect(contentEditor).toHaveValue('New Content')
  })

  it('saves article changes', async () => {
    render(<ArticleEditor article={mockArticle} />)

    // Make changes
    await userEvent.type(screen.getByLabelText(/title/i), ' Updated')
    await userEvent.type(screen.getByLabelText(/content/i), ' Updated')

    // Save changes
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(mockUpdateArticle).toHaveBeenCalledWith(undefined, '1', expect.objectContaining({
      title: 'Test Article Updated', content: '# Test Content\n\nThis is a test article. Updated',
    }))
  })

  it('handles article publishing', async () => {
    render(<ArticleEditor article={mockArticle} />)

    await userEvent.click(screen.getByRole('button', { name: /publish/i }))

    expect(mockUpdateArticle).toHaveBeenCalledWith(undefined, '1', expect.objectContaining({ status: ArticleStatus.PUBLISHED }))
  })

  it('creates an unsaved article once and uses its returned ID for later saves', async () => {
    render(<ArticleEditor article={{ ...mockArticle, id: '' }} />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mockCreateArticle).toHaveBeenCalledWith(undefined, expect.objectContaining({ id: '', status: ArticleStatus.DRAFT }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(mockCreateArticle).toHaveBeenCalledTimes(1)
    expect(mockUpdateArticle).toHaveBeenCalledWith(undefined, 'created-id', expect.objectContaining({ id: 'created-id' }))
  })

  it('creates an unsaved article as published', async () => {
    render(<ArticleEditor article={{ ...mockArticle, id: '' }} />)
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(mockCreateArticle).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: ArticleStatus.PUBLISHED }))
    expect(mockUpdateArticle).not.toHaveBeenCalled()
  })

  it('reports a failed creation when no article is returned', async () => {
    mockCreateArticle.mockResolvedValueOnce(null)
    render(<ArticleEditor article={{ ...mockArticle, id: '' }} />)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByText(/failed to save article/i)).toBeInTheDocument()
  })

  it('sanitizes HTML in preview', async () => {
    const { container } = render(<ArticleEditor article={{ ...mockArticle, content: '<p>Safe content</p><iframe srcdoc="<script>window.audit=1</script>"></iframe>' }} />)
    await userEvent.click(screen.getByRole('button', { name: /preview/i }))
    expect(screen.getByText('Safe content')).toBeInTheDocument()
    expect(container.querySelector('iframe, script, [srcdoc]')).toBeNull()
  })

  it('validates required fields before saving', async () => {
    render(<ArticleEditor article={{ ...mockArticle, title: '', content: '' }} />)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('shows preview mode', async () => {
    render(<ArticleEditor article={mockArticle} />)

    await userEvent.click(screen.getByRole('button', { name: /preview/i }))

    expect(screen.queryByRole('textbox', { name: /content/i })).not.toBeInTheDocument()
    expect(screen.getByText(/test content/i)).toBeInTheDocument()
  })

  it('handles category selection', async () => {
    const user = userEvent.setup()
    render(<ArticleEditor article={mockArticle} categories={mockCategories} />)

    // Test category selection
    const categorySelect = screen.getByRole('combobox', { name: /category/i })
    await user.click(categorySelect)
    await user.click(screen.getByRole('option', { name: 'Category 2' }))
    expect(categorySelect).toHaveTextContent('Category 2')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(mockUpdateArticle).toHaveBeenCalledWith(undefined, '1', expect.objectContaining({ categoryId: 'cat2' }))
  })

  it('shows error message on save failure', async () => {
    mockUpdateArticle.mockRejectedValueOnce(new Error('Failed to save article'))

    render(<ArticleEditor article={mockArticle} />)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to save article/i)).toBeInTheDocument()
    })
  })
}) 