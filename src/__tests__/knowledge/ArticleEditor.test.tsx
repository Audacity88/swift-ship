import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArticleEditor from '@/components/features/knowledge/ArticleEditor'
import { Article, ArticleStatus } from '@/types/knowledge'

// Mock data
const mockArticle: Article = {
  id: '1',
  title: 'Test Article',
  content: '# Test Content\n\nThis is a test article.',
  categoryId: 'cat1',
  status: ArticleStatus.DRAFT,
  author: {
    id: 'auth1',
    name: 'Test Author',
    email: 'test@example.com'
  },
  created_at: '2024-01-21T08:00:00Z',
  updated_at: '2024-01-21T08:00:00Z',
}

const mockCategories = [
  { id: 'cat1', name: 'Category 1' },
  { id: 'cat2', name: 'Category 2' },
]

// Mock service functions
const mockSaveArticle = jest.fn()
const mockPublishArticle = jest.fn()
jest.mock('@/lib/services/knowledge-service', () => ({
  saveArticle: () => mockSaveArticle(),
  publishArticle: () => mockPublishArticle(),
}))

describe('ArticleEditor Component', () => {
  beforeEach(() => {
    mockSaveArticle.mockResolvedValue({ data: mockArticle })
    mockPublishArticle.mockResolvedValue({ data: { ...mockArticle, status: ArticleStatus.PUBLISHED } })
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

    expect(mockSaveArticle).toHaveBeenCalled()
  })

  it('handles article publishing', async () => {
    render(<ArticleEditor article={mockArticle} />)

    await userEvent.click(screen.getByRole('button', { name: /publish/i }))

    expect(mockPublishArticle).toHaveBeenCalled()
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
    fireEvent.change(categorySelect, { target: { value: 'cat2' } })

    await waitFor(() => {
      expect(categorySelect).toHaveValue('cat2')
    })
  })

  it('shows error message on save failure', async () => {
    mockSaveArticle.mockRejectedValueOnce(new Error('Failed to save article'))

    render(<ArticleEditor article={mockArticle} />)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to save article/i)).toBeInTheDocument()
    })
  })
}) 