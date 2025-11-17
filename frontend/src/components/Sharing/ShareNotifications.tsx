import React, { useState } from 'react'
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  DocumentTextIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  ClockIcon,
  ShareIcon,
  ExclamationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import type { ShareNotificationsProps, ShareNotification } from '@/types/sharing'
import { format, formatDistanceToNow } from 'date-fns'

export const ShareNotifications: React.FC<ShareNotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onNavigate,
  unreadCount,
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = filter === 'unread'
    ? (notifications || []).filter(n => !n.isRead)
    : (notifications || [])

  const getNotificationIcon = (type: ShareNotification['type']) => {
    switch (type) {
      case 'share_received':
        return <ShareIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'share_accessed':
        return <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'share_expiring':
        return <ClockIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      case 'share_expired':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'comment_added':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getNotificationTitle = (notification: ShareNotification) => {
    switch (notification.type) {
      case 'share_received':
        return `${notification.sender.name} shared a document with you`
      case 'share_accessed':
        return `${notification.sender.name} accessed your shared document`
      case 'share_expiring':
        return `Document share expiring soon`
      case 'share_expired':
        return `Document share has expired`
      case 'comment_added':
        return `${notification.sender.name} commented on a shared document`
      default:
        return 'Notification'
    }
  }

  const getNotificationBgColor = (type: ShareNotification['type']) => {
    switch (type) {
      case 'share_received':
        return 'bg-blue-100 dark:bg-blue-900/30'
      case 'share_accessed':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'share_expiring':
        return 'bg-orange-100 dark:bg-orange-900/30'
      case 'share_expired':
        return 'bg-red-100 dark:bg-red-900/30'
      case 'comment_added':
        return 'bg-purple-100 dark:bg-purple-900/30'
      default:
        return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellSolidIcon className="w-6 h-6 text-gray-900 dark:text-white" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Notification settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Notification Preferences
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Email Notifications
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                In-App Notifications
              </label>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Desktop Notifications
              </label>
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                Notification Frequency
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm">
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Quiet Hours
                </label>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    From
                  </label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    To
                  </label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <BellIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Notifications
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'unread'
              ? "You're all caught up!"
              : 'Notifications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer ${
                !notification.isRead ? 'border-l-4 border-l-blue-600 dark:border-l-blue-400' : ''
              }`}
              onClick={() => onNavigate(notification)}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationBgColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm font-medium ${
                      !notification.isRead
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {getNotificationTitle(notification)}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">{notification.documentName}</span>
                    {notification.message && (
                      <>
                        <br />
                        {notification.message}
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-2">
                    {notification.sender.avatar ? (
                      <img
                        src={notification.sender.avatar}
                        alt={notification.sender.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {notification.sender.name}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-1">
                  {!notification.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onMarkAsRead(notification.id)
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Mark as read"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this notification?')) {
                        onDeleteNotification(notification.id)
                      }
                    }}
                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete notification"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
