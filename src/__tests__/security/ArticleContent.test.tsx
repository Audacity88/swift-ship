import React from 'react'
import { render, screen } from '@testing-library/react'
import { SafeArticleContent } from '@/components/shared/SafeArticleContent'

describe('safe article content', () => {
  it('preserves markdown and benign author HTML', () => {
    const { container } = render(<SafeArticleContent content={'## Heading\n\n**Important**\n\n<p><em>Formatted HTML</em></p>'} />)
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument()
    expect(container.querySelector('strong')).toHaveTextContent('Important')
    expect(container.querySelector('em')).toHaveTextContent('Formatted HTML')
  })

  it('removes executable HTML, srcdoc, handlers and unsafe links', () => {
    const payload = '<iframe srcdoc="<script>window.audit=1</script>"></iframe>\n<script>window.audit=2</script>\n<img src="x" onerror="window.audit=3">\n<a href="javascript:alert(1)">Unsafe link</a>\n<a href="https://example.invalid/help">Safe link</a>'
    const { container } = render(<SafeArticleContent content={payload} />)
    expect(container.querySelector('iframe, script, [srcdoc], [onerror]')).toBeNull()
    expect(screen.getByText('Unsafe link')).not.toHaveAttribute('href')
    expect(screen.getByRole('link', { name: 'Safe link' })).toHaveAttribute('href', 'https://example.invalid/help')
  })
})
