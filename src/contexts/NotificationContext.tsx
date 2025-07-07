import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import APIService from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const result = await APIService.getNotifications({
        page: 1,
        limit: 100, // Get enough to count unread
        unreadOnly: true,
      });

      if (result) {
        const unreadNotifications = result.notifications.filter(n => !n.isRead);
        setUnreadCount(unreadNotifications.length);
      }
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const success = await APIService.markNotificationAsRead(notificationId);
      if (success) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return Promise.reject(error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const success = await APIService.markAllNotificationsAsRead();
      if (success) {
        setUnreadCount(0);
      }
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return Promise.reject(error);
    }
  };

  // Refresh unread count when user changes or component mounts
  useEffect(() => {
    refreshUnreadCount();
  }, [user]);

  // Refresh unread count periodically (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const value: NotificationContextType = {
    unreadCount,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 