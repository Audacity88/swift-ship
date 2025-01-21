'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface FileUploadProps {
  value: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  onChange: (files: Array<{
    id: string
    name: string
    url: string
    type: string
  }>) => void
  maxFiles?: number
  maxSize?: number
  accept?: Record<string, string[]>
}

export const FileUpload = ({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = {
    'image/*': [],
    'application/pdf': [],
    'application/msword': [],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': []
  }
}: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      setIsUploading(true)

      // Here you would typically upload the files to your storage service
      // and get back URLs. This is a mock implementation.
      const newFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          // Mock file upload - in reality, you would upload to your storage service
          const id = Math.random().toString(36).substring(7)
          const url = URL.createObjectURL(file)

          return {
            id,
            name: file.name,
            url,
            type: file.type
          }
        })
      )

      onChange([...value, ...newFiles].slice(0, maxFiles))
    } catch (error) {
      console.error('Error uploading files:', error)
    } finally {
      setIsUploading(false)
    }
  }, [value, onChange, maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - value.length,
    maxSize,
    accept,
    disabled: value.length >= maxFiles || isUploading
  })

  const removeFile = (fileId: string) => {
    onChange(value.filter(file => file.id !== fileId))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted",
          (value.length >= maxFiles || isUploading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm">
            <span className="font-medium">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-muted-foreground">
            {Object.keys(accept).join(', ')} (max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each)
          </div>
        </div>
      </div>

      {value.length > 0 && (
        <ul className="grid gap-2">
          {value.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              <div className="flex-1 truncate">
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
} 