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
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants';
import { Notification, NotificationSourceType } from '../types';
import APIService from '../services/api';
import ActivityCard from '../components/common/ActivityCard';
import ActivitySearch from '../components/common/ActivitySearch';
import ActivityTimeline from '../components/common/ActivityTimeline';

const EnhancedNotificationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<NotificationSourceType[]>([]);

  const tabs = [
    { id: 'all', name: 'All', icon: 'notifications' },
    { id: 'invites', name: 'Invites', icon: 'mail' },
    { id: 'updates', name: 'Updates', icon: 'information-circle' },
    { id: 'social', name: 'Social', icon: 'people' },
  ];

  useEffect(() => {
    loadNotifications(true);
  }, [activeTab]);

  useEffect(() => {
    applyFilters();
  }, [notifications, searchQuery, searchFilters, activeTab]);

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

  const applyFilters = () => {
    let filtered = notifications;

    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(notification => {
        switch (activeTab) {
          case 'invites':
            return [
              NotificationSourceType.ATTENDEE,
              NotificationSourceType.PRIVATE_INVITATION,
              NotificationSourceType.FRIEND_REQUEST
            ].includes(notification.sourceType);
          case 'updates':
            return [
              NotificationSourceType.EVENT_UPDATE,
              NotificationSourceType.EVENT_CANCELLED,
              NotificationSourceType.EVENT_REMINDER,
              NotificationSourceType.SYSTEM
            ].includes(notification.sourceType);
          case 'social':
            return [
              NotificationSourceType.COMMENT,
              NotificationSourceType.MENTION,
              NotificationSourceType.FRIEND_REQUEST
            ].includes(notification.sourceType);
          default:
            return true;
        }
      });
    }

    // Apply search filters
    if (searchFilters.length > 0) {
      filtered = filtered.filter(notification => 
        searchFilters.includes(notification.sourceType)
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.message.toLowerCase().includes(query) ||
        notification.sourceType.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
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

  const handleNotificationPress = (notification: Notification) => {
    // Handle navigation based on notification type and link
    if (notification.link) {
      console.log('Navigate to:', notification.link);
      // TODO: Implement proper navigation
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const success = await APIService.markNotificationAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true, readAt: new Date() }
              : notification
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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

  const handleQuickAction = async (notificationId: string, action: 'accept' | 'decline') => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;

      let success = false;
      
      // Handle different types of notifications
      switch (notification.sourceType) {
        case NotificationSourceType.FRIEND_REQUEST:
          if (notification.friendRequestId) {
            success = await APIService.respondToFriendRequest(
              notification.friendRequestId, 
              action === 'accept' ? 'accepted' : 'declined'
            );
          }
          break;
        case NotificationSourceType.PRIVATE_INVITATION:
        case NotificationSourceType.ATTENDEE:
          if (notification.attendeeId) {
            success = await APIService.updateRSVP(
              notification.attendeeId, 
              action === 'accept' ? 'YES' : 'NO'
            );
          }
          break;
      }

      if (success) {
        // Mark as read and update UI
        await markAsRead(notificationId);
        Alert.alert('Success', `${action === 'accept' ? 'Accepted' : 'Declined'} successfully!`);
      } else {
        Alert.alert('Error', `Failed to ${action}. Please try again.`);
      }
    } catch (error) {
      console.error(`Error handling ${action}:`, error);
      Alert.alert('Error', `Failed to ${action}. Please try again.`);
    }
  };

  const markAllAsRead = async () => {
    try {
      const success = await APIService.markAllNotificationsAsRead();
      if (success) {
        setNotifications(prev => 
          prev.map(notification => ({ 
            ...notification, 
            isRead: true, 
            readAt: new Date() 
          }))
        );
        Alert.alert('Success', 'All notifications marked as read.');
      } else {
        Alert.alert('Error', 'Failed to mark all notifications as read.');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read.');
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      'Clear All Activity',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
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

  const renderTabButton = (tab: typeof tabs[0]) => (
    <TouchableOpacity
      key={tab.id}
      style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab.id)}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} style={styles.tabButtonBlur}>
        <View style={[
          styles.tabButtonContent,
          activeTab === tab.id && styles.tabButtonContentActive
        ]}>
          <Ionicons 
            name={tab.icon as any} 
            size={16} 
            color={activeTab === tab.id ? Colors.white : 'rgba(255, 255, 255, 0.7)'} 
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === tab.id && styles.tabButtonTextActive
          ]}>
            {tab.name}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: Notification }) => (
    <ActivityCard
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkAsRead={() => markAsRead(item.id)}
      onDelete={() => deleteNotification(item.id)}
      onQuickAction={(action) => handleQuickAction(item.id, action)}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Activity</Text>
              <Text style={styles.subtitle}>Stay updated with your events and connections</Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'timeline' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('timeline')}
              >
                <Ionicons 
                  name="list" 
                  size={20} 
                  color={viewMode === 'timeline' ? Colors.primary : 'rgba(255, 255, 255, 0.6)'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons 
                  name="grid" 
                  size={20} 
                  color={viewMode === 'list' ? Colors.primary : 'rgba(255, 255, 255, 0.6)'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search */}
        <ActivitySearch
          onSearch={setSearchQuery}
          onFilterChange={setSearchFilters}
          placeholder="Search your activity..."
        />

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            <View style={styles.tabsContent}>
              {tabs.map(renderTabButton)}
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.notificationsContainer}>
          {viewMode === 'timeline' ? (
            <ActivityTimeline
              notifications={filteredNotifications}
              onNotificationPress={handleNotificationPress}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
              onQuickAction={handleQuickAction}
            />
          ) : (
            <FlatList
              data={filteredNotifications}
              renderItem={renderListItem}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={Colors.primary}
                  titleColor={Colors.white}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.1}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadMoreText}>Loading more...</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* Action Buttons */}
        {filteredNotifications.length > 0 && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
              <BlurView intensity={100} style={styles.actionButtonBlur}>
                <View style={[styles.actionButtonContent, styles.actionButtonSecondary]}>
                  <Ionicons name="checkmark-done" size={18} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.actionButtonSecondaryText}>Mark All Read</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={clearAllNotifications}>
              <BlurView intensity={100} style={styles.actionButtonBlur}>
                <View style={[styles.actionButtonContent, styles.actionButtonPrimary]}>
                  <Ionicons name="trash" size={18} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Clear All</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewModeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
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
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default EnhancedNotificationsScreen; 