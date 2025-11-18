import React, { useState } from 'react'
import {
  UserIcon,
  ChatBubbleLeftIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  HandThumbUpIcon,
  FaceSmileIcon,
  MapPinIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import type {
  CollaborationPanelProps,
  Comment,
  ActiveViewer,
  DocumentAnnotation,
} from '@/types/sharing'
import { format, formatDistanceToNow } from 'date-fns'
import { extractMentions } from '@/types/sharing'

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  documentId,
  activeViewers = [],
  comments = [],
  annotations = [],
  onAddComment,
  onReplyToComment,
  onAddAnnotation,
  onResolveAnnotation,
  currentUser,
  canComment = true,
  canAnnotate = true,
  showViewers = true,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'annotations'>('comments')
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [annotationMode, setAnnotationMode] = useState<'highlight' | 'note' | null>(null)

  const handleAddComment = () => {
    if (!newComment.trim() || !onAddComment) return

    const mentions = extractMentions(newComment)
    onAddComment(newComment, mentions)
    setNewComment('')
  }

  const handleReplyToComment = (commentId: string) => {
    if (!replyText.trim() || !onReplyToComment) return

    onReplyToComment(commentId, replyText)
    setReplyText('')
    setReplyingTo(null)
  }

  const getViewerColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ]
    return colors[index % colors.length]
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const isReplying = replyingTo === comment.id

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-8 mt-3' : 'mt-4'}>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            {comment.author.avatar ? (
              <img
                src={comment.author.avatar}
                alt={comment.author.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
                )}
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {comment.content}
              </p>

              {/* Mentions */}
              {comment.mentions && comment.mentions.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {comment.mentions.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                    >
                      @{user.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {comment.reactions && comment.reactions.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {comment.reactions.map((reaction) => (
                    <button
                      key={reaction.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-gray-600 dark:text-gray-400">1</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mt-2">
                {canComment && (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reply
                  </button>
                )}
                <button className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline">
                  React
                </button>
                {comment.author.id === currentUser.id && (
                  <>
                    <button className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:underline">
                      Edit
                    </button>
                    <button className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply Input */}
        {isReplying && (
          <div className="mt-3 ml-11">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleReplyToComment(comment.id)
                  }
                }}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => handleReplyToComment(comment.id)}
                disabled={!replyText.trim()}
                className="p-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null)
                  setReplyText('')
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Active Viewers */}
      {showViewers && activeViewers.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Active Viewers ({activeViewers.length})
          </h3>
          <div className="flex items-center gap-2">
            {activeViewers.slice(0, 5).map((viewer, index) => (
              <div key={viewer.user.id} className="relative group">
                {viewer.user.avatar ? (
                  <img
                    src={viewer.user.avatar}
                    alt={viewer.user.name}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ borderColor: viewer.color }}
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full ${getViewerColor(index)} flex items-center justify-center text-white text-xs font-medium`}
                  >
                    {viewer.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {viewer.isTyping && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                  {viewer.user.name}
                  {viewer.isTyping && ' (typing...)'}
                </div>
              </div>
            ))}
            {activeViewers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                +{activeViewers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'comments'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <ChatBubbleLeftIcon className="w-4 h-4 inline mr-1" />
          Comments ({comments.length})
        </button>
        <button
          onClick={() => setActiveTab('annotations')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'annotations'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <PencilSquareIcon className="w-4 h-4 inline mr-1" />
          Annotations ({annotations.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'comments' ? (
          <div>
            {/* New Comment Input */}
            {canComment && (
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleAddComment()
                    }
                  }}
                  placeholder="Add a comment... (use @ to mention)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Ctrl+Enter to submit
                  </span>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            )}

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <ChatBubbleLeftIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.filter((c) => !c.parentId).map((comment) => renderComment(comment))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Annotation Tools */}
            {canAnnotate && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Annotation Tools
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAnnotationMode('highlight')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      annotationMode === 'highlight'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <PencilIcon className="w-4 h-4 inline mr-1" />
                    Highlight
                  </button>
                  <button
                    onClick={() => setAnnotationMode('note')}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      annotationMode === 'note'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    Note
                  </button>
                </div>
                {annotationMode && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Click on the document to add a {annotationMode}
                  </p>
                )}
              </div>
            )}

            {/* Annotations List */}
            {annotations.length === 0 ? (
              <div className="text-center py-8">
                <PencilSquareIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No annotations yet. Add highlights or notes to the document.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className={`p-3 rounded-lg border ${
                      annotation.isResolved
                        ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 opacity-60'
                        : 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: annotation.color }}
                      >
                        {annotation.type === 'highlight' ? (
                          <PencilIcon className="w-4 h-4 text-white" />
                        ) : (
                          <MapPinIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {annotation.author.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(annotation.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {annotation.content && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {annotation.content}
                          </p>
                        )}
                        {annotation.pageNumber && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Page {annotation.pageNumber}
                          </p>
                        )}
                      </div>
                      {onResolveAnnotation && !annotation.isResolved && (
                        <button
                          onClick={() => onResolveAnnotation(annotation.id)}
                          className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Resolve annotation"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {annotation.isResolved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                        <CheckIcon className="w-3 h-3" />
                        Resolved
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
