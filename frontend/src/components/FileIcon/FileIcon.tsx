/**
 * FileIcon Component
 * Renders realistic file type icons using react-file-icon
 */

import { FC, useMemo } from 'react'
import { FileIcon as ReactFileIcon, defaultStyles } from 'react-file-icon'
import { FolderIcon } from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'

interface FileIconProps {
  /** File name with extension */
  fileName?: string
  /** MIME type (used as fallback) */
  mimeType?: string
  /** Size of the icon */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Additional class name for the container */
  className?: string
  /** Whether this is a folder */
  isFolder?: boolean
}

// Size mappings in pixels - used by react-file-icon
const SIZE_MAP: Record<string, number> = {
  sm: 28,
  md: 36,
  lg: 44,
  xl: 56,
}

// Container size classes - slightly larger to give icon breathing room
const CONTAINER_CLASSES: Record<string, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
}

// Custom styles for extensions not in defaultStyles
const customStyles: Record<string, object> = {
  // Programming languages
  py: { type: 'code', color: '#3776AB', labelColor: '#FFD43B' },
  python: { type: 'code', color: '#3776AB', labelColor: '#FFD43B' },
  js: { type: 'code', color: '#F7DF1E', labelColor: '#000000' },
  jsx: { type: 'code', color: '#61DAFB', labelColor: '#000000' },
  ts: { type: 'code', color: '#3178C6', labelColor: '#FFFFFF' },
  tsx: { type: 'code', color: '#3178C6', labelColor: '#FFFFFF' },
  java: { type: 'code', color: '#ED8B00', labelColor: '#FFFFFF' },
  c: { type: 'code', color: '#A8B9CC', labelColor: '#000000' },
  cpp: { type: 'code', color: '#00599C', labelColor: '#FFFFFF' },
  cs: { type: 'code', color: '#512BD4', labelColor: '#FFFFFF' },
  go: { type: 'code', color: '#00ADD8', labelColor: '#FFFFFF' },
  rs: { type: 'code', color: '#DEA584', labelColor: '#000000' },
  rust: { type: 'code', color: '#DEA584', labelColor: '#000000' },
  rb: { type: 'code', color: '#CC342D', labelColor: '#FFFFFF' },
  ruby: { type: 'code', color: '#CC342D', labelColor: '#FFFFFF' },
  php: { type: 'code', color: '#777BB4', labelColor: '#FFFFFF' },
  swift: { type: 'code', color: '#F05138', labelColor: '#FFFFFF' },
  kt: { type: 'code', color: '#7F52FF', labelColor: '#FFFFFF' },
  kotlin: { type: 'code', color: '#7F52FF', labelColor: '#FFFFFF' },
  scala: { type: 'code', color: '#DC322F', labelColor: '#FFFFFF' },
  r: { type: 'code', color: '#276DC3', labelColor: '#FFFFFF' },
  lua: { type: 'code', color: '#000080', labelColor: '#FFFFFF' },
  dart: { type: 'code', color: '#0175C2', labelColor: '#FFFFFF' },
  vue: { type: 'code', color: '#4FC08D', labelColor: '#FFFFFF' },
  svelte: { type: 'code', color: '#FF3E00', labelColor: '#FFFFFF' },

  // Web & markup
  html: { type: 'code', color: '#E34F26', labelColor: '#FFFFFF' },
  htm: { type: 'code', color: '#E34F26', labelColor: '#FFFFFF' },
  css: { type: 'code', color: '#1572B6', labelColor: '#FFFFFF' },
  scss: { type: 'code', color: '#CC6699', labelColor: '#FFFFFF' },
  sass: { type: 'code', color: '#CC6699', labelColor: '#FFFFFF' },
  less: { type: 'code', color: '#1D365D', labelColor: '#FFFFFF' },

  // Data & config
  json: { type: 'code', color: '#000000', labelColor: '#F7DF1E' },
  xml: { type: 'code', color: '#0060AC', labelColor: '#FFFFFF' },
  yaml: { type: 'settings', color: '#CB171E', labelColor: '#FFFFFF' },
  yml: { type: 'settings', color: '#CB171E', labelColor: '#FFFFFF' },
  toml: { type: 'settings', color: '#9C4121', labelColor: '#FFFFFF' },
  ini: { type: 'settings', color: '#6D6D6D', labelColor: '#FFFFFF' },
  env: { type: 'settings', color: '#ECD53F', labelColor: '#000000' },
  conf: { type: 'settings', color: '#6D6D6D', labelColor: '#FFFFFF' },
  config: { type: 'settings', color: '#6D6D6D', labelColor: '#FFFFFF' },

  // Database & query
  sql: { type: 'code', color: '#336791', labelColor: '#FFFFFF' },
  db: { type: 'binary', color: '#003B57', labelColor: '#FFFFFF' },
  sqlite: { type: 'binary', color: '#003B57', labelColor: '#FFFFFF' },

  // Shell & scripts
  sh: { type: 'code', color: '#4EAA25', labelColor: '#FFFFFF' },
  bash: { type: 'code', color: '#4EAA25', labelColor: '#FFFFFF' },
  zsh: { type: 'code', color: '#4EAA25', labelColor: '#FFFFFF' },
  ps1: { type: 'code', color: '#012456', labelColor: '#FFFFFF' },
  bat: { type: 'code', color: '#C1F12E', labelColor: '#000000' },
  cmd: { type: 'code', color: '#C1F12E', labelColor: '#000000' },

  // DevOps & containers
  dockerfile: { type: 'code', color: '#2496ED', labelColor: '#FFFFFF' },
  docker: { type: 'code', color: '#2496ED', labelColor: '#FFFFFF' },

  // Documents - enhanced
  pdf: { type: 'acrobat', color: '#FF0000', glyphColor: '#FFFFFF' },
  doc: { type: 'document', color: '#2B579A', glyphColor: '#FFFFFF' },
  docx: { type: 'document', color: '#2B579A', glyphColor: '#FFFFFF' },
  rtf: { type: 'document', color: '#7B7B7B', glyphColor: '#FFFFFF' },
  odt: { type: 'document', color: '#0066B3', glyphColor: '#FFFFFF' },
  txt: { type: 'document', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  md: { type: 'document', color: '#000000', glyphColor: '#FFFFFF' },
  markdown: { type: 'document', color: '#000000', glyphColor: '#FFFFFF' },

  // Spreadsheets - enhanced
  xls: { type: 'spreadsheet', color: '#217346', glyphColor: '#FFFFFF' },
  xlsx: { type: 'spreadsheet', color: '#217346', glyphColor: '#FFFFFF' },
  csv: { type: 'spreadsheet', color: '#217346', glyphColor: '#FFFFFF' },
  ods: { type: 'spreadsheet', color: '#0066B3', glyphColor: '#FFFFFF' },
  numbers: { type: 'spreadsheet', color: '#34C759', glyphColor: '#FFFFFF' },

  // Presentations - enhanced
  ppt: { type: 'presentation', color: '#D24726', glyphColor: '#FFFFFF' },
  pptx: { type: 'presentation', color: '#D24726', glyphColor: '#FFFFFF' },
  odp: { type: 'presentation', color: '#0066B3', glyphColor: '#FFFFFF' },
  key: { type: 'presentation', color: '#009CDA', glyphColor: '#FFFFFF' },

  // Images
  jpg: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  jpeg: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  png: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  gif: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  webp: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  bmp: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  ico: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  tiff: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  tif: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  heic: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  raw: { type: 'image', color: '#50B848', glyphColor: '#FFFFFF' },
  psd: { type: 'image', color: '#31A8FF', glyphColor: '#FFFFFF' },
  ai: { type: 'vector', color: '#FF9A00', glyphColor: '#FFFFFF' },
  svg: { type: 'vector', color: '#FFB13B', glyphColor: '#000000' },
  eps: { type: 'vector', color: '#FF9A00', glyphColor: '#FFFFFF' },
  sketch: { type: 'vector', color: '#FDAD00', glyphColor: '#000000' },
  fig: { type: 'vector', color: '#F24E1E', glyphColor: '#FFFFFF' },
  figma: { type: 'vector', color: '#F24E1E', glyphColor: '#FFFFFF' },
  xd: { type: 'vector', color: '#FF61F6', glyphColor: '#FFFFFF' },

  // Videos
  mp4: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  avi: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  mov: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  mkv: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  wmv: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  flv: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  webm: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },
  m4v: { type: 'video', color: '#FF6B6B', glyphColor: '#FFFFFF' },

  // Audio
  mp3: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },
  wav: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },
  ogg: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },
  flac: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },
  aac: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },
  m4a: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },
  wma: { type: 'audio', color: '#9B59B6', glyphColor: '#FFFFFF' },

  // Archives
  zip: { type: 'compressed', color: '#FFB800', glyphColor: '#000000' },
  rar: { type: 'compressed', color: '#6C3E99', glyphColor: '#FFFFFF' },
  '7z': { type: 'compressed', color: '#000000', glyphColor: '#FFFFFF' },
  tar: { type: 'compressed', color: '#A52A2A', glyphColor: '#FFFFFF' },
  gz: { type: 'compressed', color: '#F34B7D', glyphColor: '#FFFFFF' },
  gzip: { type: 'compressed', color: '#F34B7D', glyphColor: '#FFFFFF' },
  bz2: { type: 'compressed', color: '#F34B7D', glyphColor: '#FFFFFF' },
  xz: { type: 'compressed', color: '#F34B7D', glyphColor: '#FFFFFF' },

  // Executables & binaries
  exe: { type: 'binary', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  msi: { type: 'binary', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  dmg: { type: 'binary', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  app: { type: 'binary', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  deb: { type: 'binary', color: '#A81D33', glyphColor: '#FFFFFF' },
  rpm: { type: 'binary', color: '#EE0000', glyphColor: '#FFFFFF' },
  apk: { type: 'binary', color: '#3DDC84', glyphColor: '#FFFFFF' },
  ipa: { type: 'binary', color: '#007AFF', glyphColor: '#FFFFFF' },

  // Fonts
  ttf: { type: 'font', color: '#000000', glyphColor: '#FFFFFF' },
  otf: { type: 'font', color: '#000000', glyphColor: '#FFFFFF' },
  woff: { type: 'font', color: '#000000', glyphColor: '#FFFFFF' },
  woff2: { type: 'font', color: '#000000', glyphColor: '#FFFFFF' },
  eot: { type: 'font', color: '#000000', glyphColor: '#FFFFFF' },

  // 3D & CAD
  obj: { type: '3d', color: '#F7941E', glyphColor: '#FFFFFF' },
  fbx: { type: '3d', color: '#00A3E0', glyphColor: '#FFFFFF' },
  stl: { type: '3d', color: '#00A3E0', glyphColor: '#FFFFFF' },
  blend: { type: '3d', color: '#F5792A', glyphColor: '#FFFFFF' },
  max: { type: '3d', color: '#00A3A3', glyphColor: '#FFFFFF' },
  dwg: { type: '3d', color: '#E51937', glyphColor: '#FFFFFF' },
  dxf: { type: '3d', color: '#E51937', glyphColor: '#FFFFFF' },

  // Misc
  log: { type: 'document', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  bak: { type: 'binary', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  tmp: { type: 'binary', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  lock: { type: 'settings', color: '#6D6D6D', glyphColor: '#FFFFFF' },
  gitignore: { type: 'settings', color: '#F05032', glyphColor: '#FFFFFF' },
  npmrc: { type: 'settings', color: '#CB3837', glyphColor: '#FFFFFF' },
  editorconfig: { type: 'settings', color: '#000000', glyphColor: '#FFFFFF' },
  prettierrc: { type: 'settings', color: '#F7B93E', glyphColor: '#000000' },
  eslintrc: { type: 'settings', color: '#4B32C3', glyphColor: '#FFFFFF' },
}

/**
 * Get file extension from filename
 */
function getExtension(fileName: string): string {
  if (!fileName) return ''
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * Get extension from mime type as fallback
 */
function getExtensionFromMime(mimeType?: string): string {
  if (!mimeType) return ''

  // Common mime type to extension mappings
  const mimeMap: Record<string, string> = {
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/rtf': 'rtf',
    'text/rtf': 'rtf',

    // Spreadsheets
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'application/csv': 'csv',

    // Presentations
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',

    // Text & code files
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/javascript': 'js',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'text/markdown': 'md',
    'text/x-markdown': 'md',
    'text/x-python': 'py',
    'application/x-python': 'py',
    'application/x-python-code': 'py',
    'text/x-sql': 'sql',
    'application/sql': 'sql',
    'application/x-sql': 'sql',
    'text/x-yaml': 'yml',
    'application/x-yaml': 'yml',
    'text/yaml': 'yml',
    'application/yaml': 'yml',

    // Archives
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
    'application/gzip': 'gz',
    'application/x-gzip': 'gz',
    'application/x-tar': 'tar',

    // Images
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/x-icon': 'ico',

    // Videos
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',

    // Audio
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
  }

  return mimeMap[mimeType] || ''
}

/**
 * Get icon styles for an extension
 */
function getIconStyles(extension: string): object {
  // Check custom styles first
  if (customStyles[extension]) {
    return customStyles[extension]
  }

  // Check default styles from react-file-icon
  const defaultStylesTyped = defaultStyles as Record<string, object>
  if (defaultStylesTyped[extension]) {
    return defaultStylesTyped[extension]
  }

  // Return generic style
  return { type: 'document', color: '#6D6D6D' }
}

export const FileIcon: FC<FileIconProps> = ({
  fileName = '',
  mimeType,
  size = 'md',
  className,
  isFolder = false,
}) => {
  // Memoize to prevent unnecessary recalculations
  const { extension, styles } = useMemo(() => {
    // Primary: get extension from filename
    let ext = getExtension(fileName)

    // If no extension from filename, try to get from MIME type
    if (!ext && mimeType) {
      ext = getExtensionFromMime(mimeType)
    }

    // If MIME type is text/plain but we have an extension, use the extension
    // (browsers often detect .py, .sql, .yml as text/plain)
    const finalExt = ext || 'file'
    const finalStyles = getIconStyles(finalExt)

    return {
      extension: finalExt,
      styles: finalStyles,
    }
  }, [fileName, mimeType])

  // Folder icon
  if (isFolder) {
    return (
      <div className={cn('flex items-center justify-center', className || CONTAINER_CLASSES[size])}>
        <FolderIcon className="w-full h-full text-blue-500" />
      </div>
    )
  }

  // If className includes width/height, use that instead of default container size
  const hasCustomSize = className && (className.includes('w-') || className.includes('h-'))
  const containerClass = hasCustomSize ? className : cn(CONTAINER_CLASSES[size], className)

  return (
    <div className={cn('flex items-center justify-center', containerClass)}>
      <ReactFileIcon
        extension={extension}
        {...styles}
        size={hasCustomSize ? undefined : SIZE_MAP[size]}
        labelUppercase
        fold
        radius={4}
      />
    </div>
  )
}

/**
 * Get file icon color class based on file name/extension
 */
export function getFileIconColor(fileName: string): string {
  const extension = getExtension(fileName)
  const styles = getIconStyles(extension) as { color?: string }
  return styles.color || '#6D6D6D'
}

/**
 * Get file category from file name
 */
export function getFileCategoryFromName(fileName: string, mimeType?: string): string {
  let extension = getExtension(fileName)
  if (!extension && mimeType) {
    extension = getExtensionFromMime(mimeType)
  }

  const styles = getIconStyles(extension) as { type?: string }
  return styles.type || 'document'
}

export default FileIcon
