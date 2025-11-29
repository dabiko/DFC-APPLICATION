/**
 * ConnectionLine Component
 *
 * Renders a connection line between two workflow steps.
 * Uses bezier curves for smooth connections.
 */

import type { Connection, Position } from './types'

interface ConnectionLineProps {
  connection: Connection
  sourcePosition: Position
  targetPosition: Position
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

export default function ConnectionLine({
  connection,
  sourcePosition,
  targetPosition,
  isSelected,
  onClick,
  onDelete,
}: ConnectionLineProps) {
  // Calculate bezier curve control points
  const dy = targetPosition.y - sourcePosition.y
  const controlPointOffset = Math.min(Math.abs(dy) / 2, 100)

  const path = `
    M ${sourcePosition.x} ${sourcePosition.y}
    C ${sourcePosition.x} ${sourcePosition.y + controlPointOffset},
      ${targetPosition.x} ${targetPosition.y - controlPointOffset},
      ${targetPosition.x} ${targetPosition.y}
  `

  // Calculate midpoint for label
  const midX = (sourcePosition.x + targetPosition.x) / 2
  const midY = (sourcePosition.y + targetPosition.y) / 2

  return (
    <g className="cursor-pointer" onClick={onClick}>
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="pointer-events-auto"
      />

      {/* Visible connection line */}
      <path
        d={path}
        stroke={isSelected ? '#3b82f6' : connection.isConditional ? '#8b5cf6' : '#9ca3af'}
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
        markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
        className={`transition-all duration-200 ${isSelected ? 'filter drop-shadow-md' : ''}`}
        strokeDasharray={connection.isConditional ? '5,5' : 'none'}
      />

      {/* Connection label */}
      {connection.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x="-30"
            y="-10"
            width="60"
            height="20"
            rx="4"
            fill={isSelected ? '#3b82f6' : '#ffffff'}
            stroke={isSelected ? '#3b82f6' : '#d1d5db'}
            strokeWidth="1"
            className="dark:fill-gray-800 dark:stroke-gray-600"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fill={isSelected ? '#ffffff' : '#6b7280'}
            className="dark:fill-gray-300"
          >
            {connection.label}
          </text>
        </g>
      )}

      {/* Conditional indicator */}
      {connection.isConditional && !connection.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <circle r="8" fill={isSelected ? '#3b82f6' : '#8b5cf6'} className="transition-colors" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fill="#ffffff"
            fontWeight="bold"
          >
            ?
          </text>
        </g>
      )}

      {/* Delete button (shown when selected) */}
      {isSelected && (
        <g
          transform={`translate(${midX + 20}, ${midY - 20})`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="cursor-pointer"
        >
          <circle r="10" fill="#ef4444" className="transition-colors hover:fill-red-600" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fill="#ffffff"
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}
    </g>
  )
}
