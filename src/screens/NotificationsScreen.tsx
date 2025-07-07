import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants';
import { Notification, NotificationSourceType } from '../types';
import APIService from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { unreadCount, refreshUnreadCount, markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const tabs = [
    { id: 'all', name: 'All', icon: 'notifications' },
    { id: 'invites', name: 'Invites', icon: 'mail' },
    { id: 'updates', name: 'Updates', icon: 'information-circle' },
  ];

  useEffect(() => {
    loadNotifications(true);
  }, [activeTab]);



  const loadNotifications = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const result = await APIService.getNotifications({
        page: currentPage,
        limit: 20,
        unreadOnly: false,
      });

      if (result) {
        const newNotifications = result.notifications;
        
        if (reset) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setHasMore(currentPage < result.pagination.totalPages);
        setPage(currentPage + 1);
      } else {
        if (reset) {
          setNotifications([]);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      loadNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await contextMarkAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date() }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await contextMarkAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          isRead: true, 
          readAt: new Date() 
        }))
      );
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read.');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const success = await APIService.deleteNotification(notificationId);
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        Alert.alert('Error', 'Failed to delete notification.');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification.');
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all notifications one by one (API might not have bulk delete)
              const deletePromises = notifications.map(n => APIService.deleteNotification(n.id));
              await Promise.all(deletePromises);
              setNotifications([]);
              Alert.alert('Success', 'All notifications cleared.');
            } catch (error) {
              console.error('Error clearing all notifications:', error);
              Alert.alert('Error', 'Failed to clear all notifications.');
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (sourceType: NotificationSourceType): string => {
    switch (sourceType) {
      case NotificationSourceType.ATTENDEE:
      case NotificationSourceType.PRIVATE_INVITATION:
        return 'mail';
      case NotificationSourceType.FRIEND_REQUEST:
        return 'person-add';
      case NotificationSourceType.EVENT_UPDATE:
        return 'information-circle';
      case NotificationSourceType.EVENT_CANCELLED:
        return 'close-circle';
      case NotificationSourceType.EVENT_REMINDER:
        return 'time';
      case NotificationSourceType.COMMENT:
      case NotificationSourceType.MENTION:
        return 'chatbubble';
      case NotificationSourceType.SYSTEM:
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (sourceType: NotificationSourceType): string => {
    switch (sourceType) {
      case NotificationSourceType.ATTENDEE:
      case NotificationSourceType.PRIVATE_INVITATION:
        return Colors.primary;
      case NotificationSourceType.FRIEND_REQUEST:
        return Colors.systemGreen;
      case NotificationSourceType.EVENT_UPDATE:
        return Colors.systemOrange;
      case NotificationSourceType.EVENT_CANCELLED:
        return Colors.systemRed;
      case NotificationSourceType.EVENT_REMINDER:
        return Colors.systemBlue;
      case NotificationSourceType.COMMENT:
      case NotificationSourceType.MENTION:
        return Colors.systemPurple;
      case NotificationSourceType.SYSTEM:
        return Colors.gray;
      default:
        return Colors.primary;
    }
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and link
    try {
      if (notification.link) {
        const link = notification.link;
        
        // Parse the link and navigate accordingly
        if (link.startsWith('/events/')) {
          const eventId = link.split('/')[2];
          if (link.includes('/guests')) {
            (navigation as any).navigate('GuestList', { eventId });
          } else if (link.includes('#comments')) {
            (navigation as any).navigate('EventDetails', { eventId, scrollToComments: true });
          } else {
            (navigation as any).navigate('EventDetails', { eventId });
          }
        } else if (link.startsWith('/friends/requests')) {
          (navigation as any).navigate('Profile', { 
            screen: 'ProfileMain',
            params: { showFriendRequests: true }
          });
        } else if (link.startsWith('/profile/edit')) {
          (navigation as any).navigate('EditProfile');
        } else {
          console.log('Unhandled notification link:', link);
        }
      } else {
        // Default navigation based on notification type
        switch (notification.sourceType) {
          case NotificationSourceType.ATTENDEE:
          case NotificationSourceType.PRIVATE_INVITATION:
          case NotificationSourceType.EVENT_UPDATE:
          case NotificationSourceType.EVENT_CANCELLED:
          case NotificationSourceType.EVENT_REMINDER:
            // Try to extract event ID from message or use a default action
            console.log('Event-related notification without specific link');
            break;
          case NotificationSourceType.FRIEND_REQUEST:
            (navigation as any).navigate('Profile', { 
              screen: 'ProfileMain',
              params: { showFriendRequests: true }
            });
            break;
          case NotificationSourceType.COMMENT:
          case NotificationSourceType.MENTION:
            console.log('Comment/mention notification without specific link');
            break;
          case NotificationSourceType.SYSTEM:
            console.log('System notification');
            break;
          default:
            console.log('Unknown notification type:', notification.sourceType);
        }
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
      Alert.alert('Navigation Error', 'Unable to navigate to the requested screen.');
    }
  };

  const GlassTabButton: React.FC<{
    title: string;
    onPress: () => void;
    isActive?: boolean;
    icon?: string;
  }> = ({ title, onPress, isActive = false, icon }) => (
    <TouchableOpacity 
      style={[styles.tabButton, isActive && styles.tabButtonActive]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} style={styles.tabButtonBlur}>
        <View style={[
          styles.tabButtonContent,
          isActive && styles.tabButtonContentActive
        ]}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={16} 
              color={isActive ? Colors.white : 'rgba(255, 255, 255, 0.7)'} 
            />
          )}
          <Text style={[
            styles.tabButtonText,
            isActive && styles.tabButtonTextActive
          ]}>
            {title}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const NotificationItem: React.FC<{
    notification: Notification;
  }> = ({ notification }) => (
    <TouchableOpacity 
      style={styles.notificationItem} 
      activeOpacity={0.8}
      onPress={() => handleNotificationPress(notification)}
      onLongPress={() => {
        Alert.alert(
          'Notification Options',
          'What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: notification.isRead ? 'Mark as Unread' : 'Mark as Read',
              onPress: () => markAsRead(notification.id)
            },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteNotification(notification.id)
            }
          ]
        );
      }}
    >
      <BlurView intensity={80} style={styles.notificationBlur}>
        <View style={[
          styles.notificationContent,
          !notification.isRead && styles.notificationContentUnread
        ]}>
          <View style={styles.notificationLeft}>
            <View style={[
              styles.notificationIcon, 
              { backgroundColor: getNotificationColor(notification.sourceType) }
            ]}>
              <Ionicons 
                name={getNotificationIcon(notification.sourceType) as any} 
                size={20} 
                color={Colors.white} 
              />
            </View>
            <View style={styles.notificationText}>
              <Text style={styles.notificationTitle}>
                {notification.sourceType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>
                {getRelativeTime(notification.createdAt)}
              </Text>
            </View>
          </View>
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const GlassButton: React.FC<{
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    icon?: string;
  }> = ({ title, onPress, variant = 'primary', icon }) => (
    <TouchableOpacity 
      style={styles.actionButton} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={100} style={styles.actionButtonBlur}>
        <View style={[
          styles.actionButtonContent,
          variant === 'primary' ? styles.actionButtonPrimary : styles.actionButtonSecondary
        ]}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={18} 
              color={variant === 'primary' ? Colors.white : 'rgba(255, 255, 255, 0.8)'} 
            />
          )}
          <Text style={[
            styles.actionButtonText,
            variant === 'secondary' && styles.actionButtonSecondaryText
          ]}>
            {title}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'invites') {
      return notification.sourceType === NotificationSourceType.ATTENDEE ||
             notification.sourceType === NotificationSourceType.PRIVATE_INVITATION ||
             notification.sourceType === NotificationSourceType.FRIEND_REQUEST;
    }
    if (activeTab === 'updates') {
      return notification.sourceType === NotificationSourceType.EVENT_UPDATE ||
             notification.sourceType === NotificationSourceType.EVENT_CANCELLED ||
             notification.sourceType === NotificationSourceType.EVENT_REMINDER ||
             notification.sourceType === NotificationSourceType.COMMENT ||
             notification.sourceType === NotificationSourceType.MENTION ||
             notification.sourceType === NotificationSourceType.SYSTEM;
    }
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
            titleColor={Colors.white}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Stay updated with your events</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabsContent}>
              {tabs.map((tab) => (
                <GlassTabButton
                  key={tab.id}
                  title={tab.name}
                  icon={tab.icon}
                  isActive={activeTab === tab.id}
                  onPress={() => setActiveTab(tab.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsContainer}>
          {filteredNotifications.length > 0 ? (
            <>
              {filteredNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
              
              {/* Load More Indicator */}
              {loadingMore && (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadMoreText}>Loading more...</Text>
                </View>
              )}
              
              {/* End of List Indicator */}
              {!hasMore && notifications.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>You're all caught up!</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <BlurView intensity={60} style={styles.emptyIconBlur}>
                  <View style={styles.emptyIconContent}>
                    <Ionicons name="notifications-off" size={48} color="rgba(255, 255, 255, 0.6)" />
                  </View>
                </BlurView>
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySubtitle}>
                You're all caught up! New notifications will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {filteredNotifications.length > 0 && (
          <View style={styles.actionsContainer}>
            <GlassButton
              title="Mark Read"
              icon="checkmark-done"
              onPress={markAllAsRead}
              variant="secondary"
            />
            <GlassButton
              title="Clear All"
              icon="trash"
              onPress={clearAllNotifications}
              variant="primary"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  tabsContainer: {
    marginBottom: Spacing.lg,
  },
  tabsScroll: {
    paddingLeft: Spacing.xl,
  },
  tabsContent: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  tabButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  tabButtonActive: {
    transform: [{ scale: 0.95 }],
  },
  tabButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.xs,
  },
  tabButtonContentActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  tabButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabButtonTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
  notificationsContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  notificationsListContent: {
    paddingBottom: Spacing.lg,
  },
  notificationItem: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  notificationBlur: {
    borderRadius: BorderRadius.lg,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationContentUnread: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: Spacing.md,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  notificationTime: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  emptyIconBlur: {
    flex: 1,
    borderRadius: 50,
  },
  emptyIconContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  actionButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  actionButtonSecondaryText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FontSize.md,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  loadMoreText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: FontSize.sm,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  endOfListText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
});

export default NotificationsScreen; 