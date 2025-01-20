'use client'

import { useState, useRef } from 'react'
import { Paperclip, Send } from 'lucide-react'
import type { Message } from '@/types/ticket'

interface ReplyComposerProps {
  onSubmit: (message: Omit<Message, 'id' | 'createdAt'>) => void
  isSubmitting?: boolean
}

export function ReplyComposer({ onSubmit, isSubmitting = false }: ReplyComposerProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return

    onSubmit({
      content,
      author: {
        id: 'current-user-id', // This should come from auth context
        name: 'Current User', // This should come from auth context
        email: 'user@example.com', // This should come from auth context
        role: 'agent',
      },
      attachments: attachments.map((file, index) => ({
        id: `temp-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
      })),
    })

    setContent('')
    setAttachments([])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
    
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          placeholder="Type your reply..."
          className="w-full min-h-[100px] resize-y text-sm text-gray-900 bg-transparent border-0 \
            focus:ring-0 focus:outline-none"
          disabled={isSubmitting}
        />

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600"
              >
                <Paperclip className="w-4 h-4" />
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-200">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 \
              transition-colors"
            disabled={isSubmitting}
          >
            <Paperclip className="w-4 h-4" />
            Attach files
          </button>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white \
            bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
          style={{ backgroundColor: '#0052CC' }}
        >
          <Send className="w-4 h-4" />
          Send Reply
        </button>
      </div>
    </form>
  )
} 