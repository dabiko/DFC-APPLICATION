/**
 * FileDropzone Component
 * Drag-and-drop file upload area
 */

import { FC, useRef, useState, DragEvent, ChangeEvent } from 'react'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { FileDropzoneProps } from '@/types/upload'
import { validateFiles, getAcceptedFileTypesLabel } from '@/utils/fileValidation'
import { DEFAULT_UPLOAD_CONFIG } from '@/types/upload'
import { formatFileSize } from '@/utils/versionUtils'

export const FileDropzone: FC<FileDropzoneProps> = ({
  onFilesAdded,
  onFilesRejected,
  config,
  disabled = false,
  className,
  dropzoneText = 'Drag and drop files here',
  browseText = 'or click to browse',
}) => {
  const [isDragActive, setIsDragActive] = useState(false)
  const [isDragReject, setIsDragReject] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fullConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config }

  // Handle drag enter
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    setIsDragActive(true)

    // Check if files are valid type
    const items = Array.from(e.dataTransfer.items)
    const hasInvalidType = items.some((item) => {
      if (item.kind !== 'file') return true
      if (fullConfig.acceptedFileTypes.length === 0) return false
      return !fullConfig.acceptedFileTypes.some((type) =>
        item.type.includes(type.replace('/*', ''))
      )
    })

    setIsDragReject(hasInvalidType)
  }

  // Handle drag over
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle drag leave
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Only reset if leaving the dropzone itself, not a child element
    if (e.currentTarget === e.target) {
      setIsDragActive(false)
      setIsDragReject(false)
    }
  }

  // Handle drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    setIsDragActive(false)
    setIsDragReject(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  // Handle file input change
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFiles(files)
    }

    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  // Process files
  const handleFiles = (files: File[]) => {
    const { valid, errors } = validateFiles(files, fullConfig)

    if (valid.length > 0) {
      onFilesAdded(valid)
    }

    if (errors.length > 0 && onFilesRejected) {
      onFilesRejected(errors)
    }
  }

  // Handle click to open file picker
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const acceptedTypesLabel = getAcceptedFileTypesLabel(fullConfig.acceptedFileTypes)

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
        isDragActive && !isDragReject
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : '',
        isDragReject ? 'border-error-500 bg-error-50 dark:bg-error-900/20' : '',
        !isDragActive && !isDragReject
          ? 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          : '',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={fullConfig.multiple}
        accept={fullConfig.acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        aria-label="File upload input"
      />

      {/* Upload icon */}
      <div className="flex flex-col items-center justify-center gap-4">
        <CloudArrowUpIcon
          className={cn(
            'w-16 h-16 transition-colors',
            isDragActive && !isDragReject
              ? 'text-primary-600 dark:text-primary-400'
              : isDragReject
                ? 'text-error-600 dark:text-error-400'
                : 'text-gray-400 dark:text-gray-600'
          )}
        />

        {/* Text */}
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {isDragReject ? 'Some files are not supported' : dropzoneText}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{browseText}</p>
        </div>

        {/* File type info */}
        <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
          <p>Accepted file types: {acceptedTypesLabel}</p>
          <p>Maximum file size: {formatFileSize(fullConfig.maxFileSize)}</p>
          {fullConfig.multiple && <p>Maximum files: {fullConfig.maxFiles}</p>}
        </div>

        {/* Drag state indicator */}
        {isDragActive && (
          <div
            className={cn(
              'mt-4 px-4 py-2 rounded-lg text-sm font-medium',
              isDragReject
                ? 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300'
                : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            )}
          >
            {isDragReject ? 'Drop not allowed' : 'Drop files to upload'}
          </div>
        )}
      </div>
    </div>
  )
}
