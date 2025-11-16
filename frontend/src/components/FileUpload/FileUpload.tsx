import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { Progress } from '@components/Feedback'
import { Button } from '@components/Button'
import { cn } from '@utils/cn'

export interface UploadedFile {
  /** File object */
  file: File
  /** Unique ID */
  id: string
  /** Upload progress (0-100) */
  progress: number
  /** Upload status */
  status: 'pending' | 'uploading' | 'success' | 'error'
  /** Error message if status is error */
  error?: string
}

export interface FileUploadProps {
  /** Callback when files are selected */
  onFilesSelected?: (files: File[]) => void
  /** Callback for file upload (should return a promise) */
  onUpload?: (file: File) => Promise<void>
  /** Callback when file is removed */
  onRemove?: (fileId: string) => void
  /** Maximum file size in bytes */
  maxSize?: number
  /** Accepted file types (MIME types or extensions) */
  accept?: string[]
  /** Allow multiple files */
  multiple?: boolean
  /** Maximum number of files */
  maxFiles?: number
  /** Disabled state */
  disabled?: boolean
  /** Show file list */
  showFileList?: boolean
  /** Variant */
  variant?: 'default' | 'compact'
  /** Custom class name */
  className?: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB default

/**
 * FileUpload component
 *
 * A file upload component with drag-and-drop, progress tracking, and validation.
 * Essential for the DFC application's document upload functionality.
 *
 * @example
 * ```tsx
 * <FileUpload
 *   multiple
 *   accept={['.pdf', '.docx', '.xlsx']}
 *   maxSize={50 * 1024 * 1024}
 *   onUpload={async (file) => {
 *     await uploadDocument(file)
 *   }}
 * />
 * ```
 */
export function FileUpload({
  onFilesSelected,
  onUpload,
  onRemove,
  maxSize = MAX_FILE_SIZE,
  accept,
  multiple = true,
  maxFiles,
  disabled = false,
  showFileList = true,
  variant = 'default',
  className,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`
    }

    // Check file type
    if (accept && accept.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const isAccepted = accept.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase()
        }
        return file.type.match(new RegExp(type))
      })

      if (!isAccepted) {
        return `File type not accepted. Accepted types: ${accept.join(', ')}`
      }
    }

    // Check max files
    if (maxFiles && uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} file(s) allowed`
    }

    return null
  }

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    if (!multiple && fileArray.length > 1) {
      fileArray.splice(1)
    }

    onFilesSelected?.(fileArray)

    const newFiles: UploadedFile[] = fileArray.map((file) => {
      const error = validateFile(file)
      return {
        file,
        id: Math.random().toString(36).substring(7),
        progress: 0,
        status: error ? 'error' : 'pending',
        error,
      }
    })

    setUploadedFiles((prev) => [...prev, ...newFiles])

    // Start uploading valid files
    for (const uploadedFile of newFiles) {
      if (uploadedFile.status === 'pending' && onUpload) {
        uploadFile(uploadedFile)
      }
    }
  }

  const uploadFile = async (uploadedFile: UploadedFile) => {
    if (!onUpload) return

    // Update status to uploading
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'uploading', progress: 0 } : f))
    )

    try {
      // Simulate progress (in real app, use XMLHttpRequest or fetch with progress)
      const progressInterval = setInterval(() => {
        setUploadedFiles((prev) =>
          prev.map((f) => {
            if (f.id === uploadedFile.id && f.progress < 90) {
              return { ...f, progress: f.progress + 10 }
            }
            return f
          })
        )
      }, 200)

      await onUpload(uploadedFile.file)

      clearInterval(progressInterval)

      // Update status to success
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'success', progress: 100 } : f))
      )
    } catch (error) {
      // Update status to error
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      )
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
    onRemove?.(fileId)
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const { files } = e.dataTransfer
    if (files && files.length > 0) {
      processFiles(files)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target
    if (files && files.length > 0) {
      processFiles(files)
    }
    // Reset input value to allow selecting the same file again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleBrowseClick = () => {
    inputRef.current?.click()
  }

  const acceptString = accept?.join(',')

  return (
    <div className={cn('w-full', className)}>
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors',
          variant === 'default' && 'p-8',
          variant === 'compact' && 'p-4',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-700',
          !disabled && 'hover:border-gray-400 dark:hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={acceptString}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="sr-only"
        />

        <div className="flex flex-col items-center text-center">
          <CloudArrowUpIcon
            className={cn(
              'text-gray-400 dark:text-gray-600',
              variant === 'default' && 'h-12 w-12 mb-4',
              variant === 'compact' && 'h-8 w-8 mb-2'
            )}
          />

          <p
            className={cn(
              'font-medium text-gray-700 dark:text-gray-300',
              variant === 'default' && 'text-base mb-2',
              variant === 'compact' && 'text-sm mb-1'
            )}
          >
            {isDragging ? 'Drop files here' : 'Drag and drop files here'}
          </p>

          <p
            className={cn(
              'text-gray-500 dark:text-gray-400',
              variant === 'default' && 'text-sm mb-4',
              variant === 'compact' && 'text-xs mb-2'
            )}
          >
            or
          </p>

          <Button
            type="button"
            variant="primary"
            size={variant === 'compact' ? 'sm' : 'md'}
            onClick={handleBrowseClick}
            disabled={disabled}
          >
            Browse Files
          </Button>

          {(accept || maxSize) && (
            <p
              className={cn(
                'text-gray-500 dark:text-gray-400',
                variant === 'default' && 'text-xs mt-4',
                variant === 'compact' && 'text-xs mt-2'
              )}
            >
              {accept && accept.length > 0 && `Accepted: ${accept.join(', ')}`}
              {accept && accept.length > 0 && maxSize && ' • '}
              {maxSize && `Max size: ${formatFileSize(maxSize)}`}
            </p>
          )}
        </div>
      </div>

      {/* File list */}
      {showFileList && uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadedFiles.map((uploadedFile) => (
            <FileItem
              key={uploadedFile.id}
              uploadedFile={uploadedFile}
              onRemove={handleRemoveFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FileItemProps {
  uploadedFile: UploadedFile
  onRemove: (fileId: string) => void
}

function FileItem({ uploadedFile, onRemove }: FileItemProps) {
  const { file, id, progress, status, error } = uploadedFile

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Icon */}
      <div className="flex-shrink-0">
        {status === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
        ) : status === 'error' ? (
          <ExclamationCircleIcon className="h-5 w-5 text-error-600 dark:text-error-400" />
        ) : (
          <DocumentIcon className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.name}
          </p>
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            aria-label="Remove file"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {formatFileSize(file.size)}
          {status === 'uploading' && ` • ${progress}%`}
        </p>

        {/* Progress bar */}
        {status === 'uploading' && <Progress value={progress} size="sm" variant="primary" />}

        {/* Error message */}
        {status === 'error' && error && (
          <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
        )}

        {/* Success message */}
        {status === 'success' && (
          <p className="text-xs text-success-600 dark:text-success-400">Upload complete</p>
        )}
      </div>
    </div>
  )
}
