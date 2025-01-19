'use client'

import { useState } from 'react'
import { 
  Bell,
  Package,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  MoreVertical,
  Truck,
  X
} from 'lucide-react'
import { COLORS } from '@/lib/constants'
import { useNotificationStore, NotificationType } from '@/lib/store/notifications'

const filterOptions = [
  { value: 'all', label: 'All Notifications', icon: Bell },
  { value: 'shipment', label: 'Shipments', icon: Package },
  { value: 'payment', label: 'Payments', icon: CreditCard },
  { value: 'pickup', label: 'Pickups', icon: Calendar },
  { value: 'system', label: 'System', icon: AlertCircle }
]

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount } = 
    useNotificationStore()
  const [activeFilter, setActiveFilter] = useState<NotificationType>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filteredNotifications = notifications.filter(notification => {
    if (showUnreadOnly && notification.status !== 'unread') return false
    if (activeFilter === 'all') return true
    return notification.type === activeFilter
  })

  const unreadCount = getUnreadCount()

  return (
    <div className="min-h-screen bg-gray-50 -mt-6 -mx-6">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors \
                ${showUnreadOnly 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 border border-gray-200'
                }`}
              style={showUnreadOnly ? { backgroundColor: COLORS.primary } : {}}
            >
              {showUnreadOnly ? 'Show All' : 'Show Unread'}
            </button>
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm \
                font-medium text-gray-700"
            >
              Mark All as Read
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {filterOptions.map((filter) => {
            const Icon = filter.icon
            return (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value as NotificationType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm \
                  font-medium whitespace-nowrap transition-colors \
                  ${activeFilter === filter.value 
                    ? 'bg-primary text-white' 
                    : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                style={activeFilter === filter.value ? { backgroundColor: COLORS.primary } : {}}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            )
          })}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                {showUnreadOnly 
                  ? 'You have no unread notifications' 
                  : 'You are all caught up!'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg border ${
                  notification.status === 'unread' 
                    ? 'border-primary/20' 
                    : 'border-gray-200'
                }`}
                style={notification.status === 'unread' 
                  ? { borderColor: `${COLORS.primary}33` } 
                  : {}
                }
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Notification Icon */}
                      <div className={`p-2 rounded-lg ${
                        notification.status === 'unread' 
                          ? 'bg-primary/10' 
                          : 'bg-gray-100'
                        }`}
                        style={notification.status === 'unread' 
                          ? { backgroundColor: `${COLORS.primary}1a` } 
                          : {}
                        }
                      >
                        {notification.type === 'shipment' && (
                          <Truck className={`w-5 h-5 ${
                            notification.status === 'unread' 
                              ? 'text-primary' 
                              : 'text-gray-500'
                            }`}
                            style={notification.status === 'unread' 
                              ? { color: COLORS.primary } 
                              : {}
                            }
                          />
                        )}
                        {notification.type === 'payment' && (
                          <CreditCard className={`w-5 h-5 ${
                            notification.status === 'unread' 
                              ? 'text-primary' 
                              : 'text-gray-500'
                            }`}
                            style={notification.status === 'unread' 
                              ? { color: COLORS.primary } 
                              : {}
                            }
                          />
                        )}
                        {notification.type === 'pickup' && (
                          <Calendar className={`w-5 h-5 ${
                            notification.status === 'unread' 
                              ? 'text-primary' 
                              : 'text-gray-500'
                            }`}
                            style={notification.status === 'unread' 
                              ? { color: COLORS.primary } 
                              : {}
                            }
                          />
                        )}
                        {notification.type === 'system' && (
                          <AlertCircle className={`w-5 h-5 ${
                            notification.status === 'unread' 
                              ? 'text-primary' 
                              : 'text-gray-500'
                            }`}
                            style={notification.status === 'unread' 
                              ? { color: COLORS.primary } 
                              : {}
                            }
                          />
                        )}
                      </div>

                      {/* Notification Content */}
                      <div>
                        <h3 className={`font-medium ${
                          notification.status === 'unread' 
                            ? 'text-gray-900' 
                            : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {notification.timestamp}
                          </span>
                          {notification.actionLabel && (
                            <a
                              href={notification.actionUrl}
                              className="text-sm font-medium text-primary hover:text-primary/80 \
                                transition-colors"
                              style={{ color: COLORS.primary }}
                            >
                              {notification.actionLabel}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {notification.status === 'unread' && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-gray-500 \
                            transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-gray-500 \
                          transition-colors"
                        title="Delete notification"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 