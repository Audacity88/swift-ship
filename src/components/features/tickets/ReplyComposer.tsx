'use client'

import { useState, useRef } from 'react'
import { Paperclip, Send, X } from 'lucide-react'
import type { User } from '@/types/user'
import { UserRole } from '@/types/role'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ReplyMessage {
  content: string;
  user: User;
  attachments?: File[];
}

interface ReplyComposerProps {
  onSubmit: (message: ReplyMessage) => void;
  isSubmitting: boolean;
}

export function ReplyComposer({ onSubmit, isSubmitting }: ReplyComposerProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!content.trim()) return

    // Mock user data - replace with actual user data from auth context
    const mockUser: User = {
      id: '1',
      name: 'Support Agent',
      email: 'agent@example.com',
      role: UserRole.AGENT,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onSubmit({
      content: content.trim(),
      user: mockUser,
      attachments: attachments.length > 0 ? attachments : undefined
    })
    setContent('')
    setAttachments([])
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    
    // Check file size (10MB limit per file)
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      setError('Some files exceed the 10MB size limit')
      return
    }

    // Check total size (50MB total limit)
    if (totalSize > 50 * 1024 * 1024) {
      setError('Total attachment size exceeds 50MB limit')
      return
    }

    setError(null)
    setAttachments((prev) => [...prev, ...files])
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)
    
    if (files.length > 0) {
      const totalSize = files.reduce((sum, file) => sum + file.size, 0)
      
      // Check file size (10MB limit per file)
      const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024)
      if (oversizedFiles.length > 0) {
        setError('Some pasted files exceed the 10MB size limit')
        return
      }

      // Check total size (50MB total limit)
      if (totalSize > 50 * 1024 * 1024) {
        setError('Total attachment size exceeds 50MB limit')
        return
      }

      setError(null)
      setAttachments((prev) => [...prev, ...files])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    if (attachments.length === 1) {
      setError(null)
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        placeholder="Type your reply..."
        rows={4}
      />
      
      {/* File Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1"
            >
              <span className="text-sm text-gray-700">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleFileSelect}
          disabled={isSubmitting}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Attach Files
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            'Sending...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Reply
            </>
          )}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
} 