/**
 * ContextMenu Component
 * A reusable context menu with fixed positioning, auto-flip, and proper viewport handling.
 * Appears on right-click or can be triggered programmatically.
 */

import { FC, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  divider?: boolean
}

export interface ContextMenuProps {
  items: ContextMenuItem[]
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
}

interface MenuPosition {
  top: number
  left: number
  transformOrigin: string
}

export const ContextMenu: FC<ContextMenuProps> = ({ items, isOpen, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    transformOrigin: 'top left',
  })

  // Calculate optimal position with auto-flip
  const calculatePosition = useCallback(() => {
    if (!menuRef.current) return

    const menuRect = menuRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 8 // Padding from viewport edges

    let top = position.y
    let left = position.x
    let transformOrigin = 'top left'

    // Check horizontal overflow (flip to left if needed)
    if (left + menuRect.width > viewportWidth - padding) {
      left = position.x - menuRect.width
      transformOrigin = 'top right'
    }

    // Ensure not going off left edge
    if (left < padding) {
      left = padding
    }

    // Check vertical overflow (flip to top if needed)
    if (top + menuRect.height > viewportHeight - padding) {
      top = position.y - menuRect.height
      transformOrigin = transformOrigin.replace('top', 'bottom')
    }

    // Ensure not going off top edge
    if (top < padding) {
      top = padding
    }

    setMenuPosition({ top, left, transformOrigin })
  }, [position])

  // Calculate position when menu opens or position changes
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to ensure menu is rendered before calculating
      requestAnimationFrame(() => {
        calculatePosition()
      })
    }
  }, [isOpen, position, calculatePosition])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleScroll = () => {
      onClose()
    }

    // Delay adding listeners to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      window.addEventListener('scroll', handleScroll, true)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const menuContent = (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[9999] min-w-[180px] max-w-[280px]',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'rounded-lg shadow-xl',
        'py-1.5',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        transformOrigin: menuPosition.transformOrigin,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="my-1.5 border-t border-gray-200 dark:border-gray-700"
            />
          )
        }

        return (
          <button
            key={item.id}
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
              'text-left',
              item.disabled
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                : item.danger
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {item.icon && (
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        )
      })}
    </div>
  )

  // Use portal to render at document body level
  return createPortal(menuContent, document.body)
}

export default ContextMenu
