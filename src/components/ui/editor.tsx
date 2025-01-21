'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '@/lib/utils'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const Editor = ({
  value,
  onChange,
  placeholder,
  className
}: EditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3',
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return <EditorContent editor={editor} />
} 