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

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'shipment',
    title: 'Shipment Delivered',
    message: 'Package #1234 has been delivered successfully to John Doe',
    timestamp: '2 minutes ago',
    status: 'unread',
    actionLabel: 'View Details',
    actionUrl: '/shipments/1234'
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Successful',
    message: 'Your payment of $49.99 for the Pro Plan has been processed',
    timestamp: '1 hour ago',
    status: 'unread',
    actionLabel: 'View Invoice',
    actionUrl: '/billing'
  },
  {
    id: '4',
    type: 'system',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur on Sunday at 2 AM EST',
    timestamp: '1 day ago',
    status: 'read'
  },
  {
    id: '5',
    type: 'shipment',
    title: 'Shipment Delayed',
    message: 'Package #2345 is experiencing a slight delay',
    timestamp: '1 day ago',
    status: 'read',
    actionLabel: 'Track Package',
    actionUrl: '/shipments/2345'
  }
]

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: mockNotifications,
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
      name: 'notifications-storage'
    }
  )
) 