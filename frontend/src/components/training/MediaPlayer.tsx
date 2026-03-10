/**
 * MediaPlayer — Video player with completion tracking callback.
 */

import { useState } from 'react'
import { Play, CheckCircle } from 'lucide-react'

interface MediaPlayerProps {
  src: string
  title: string
  onComplete?: () => void
  isCompleted?: boolean
}

export function MediaPlayer({ src, title, onComplete, isCompleted }: MediaPlayerProps) {
  const [hasEnded, setHasEnded] = useState(false)

  const handleEnded = () => {
    setHasEnded(true)
    onComplete?.()
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-900 p-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Play className="h-3 w-3" />
          {title}
        </span>
        {(isCompleted || hasEnded) && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3 w-3" /> Watched
          </span>
        )}
      </div>
      <video src={src} controls className="w-full max-h-96" onEnded={handleEnded}>
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
