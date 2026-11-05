import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType = 'all' | 'shipment' | 'payment' | 'system'
export type NotificationStatus = 'unread' | 'read'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  status: NotificationStatus
  actionLabel?: string
  actionUrl?: string
}

interface NotificationStore {
  notifications: Notification[]
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  getUnreadCount: () => number
}

// Notifications start empty until a real event is received.

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((notification) =>
          notification.id === id ? { ...notification, status: 'read' } : notification
        )
      })),
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((notification) => ({
          ...notification,
          status: 'read'
        }))
      })),
      deleteNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((notification) => notification.id !== id)
      })),
      getUnreadCount: () => get().notifications.filter((n) => n.status === 'unread').length
    }),
    {
      name: 'notifications-storage-v2'
    }
  )
) 