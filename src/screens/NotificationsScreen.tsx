import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants';

const NotificationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', name: 'All', icon: 'notifications' },
    { id: 'invites', name: 'Invites', icon: 'mail' },
    { id: 'updates', name: 'Updates', icon: 'information-circle' },
  ];

  const mockNotifications = [
    {
      id: '1',
      type: 'invite',
      title: 'Event Invitation',
      message: 'Sarah Johnson invited you to Summer BBQ & Pool Party',
      time: '5 min ago',
      unread: true,
      icon: 'mail',
      color: Colors.primary,
    },
    {
      id: '2',
      type: 'update',
      title: 'Event Update',
      message: 'Location changed for Tech Networking Mixer',
      time: '1 hour ago',
      unread: true,
      icon: 'location',
      color: Colors.systemOrange,
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Event Reminder',
      message: 'Rooftop Sunset Yoga starts in 30 minutes',
      time: '2 hours ago',
      unread: false,
      icon: 'time',
      color: Colors.systemGreen,
    },
  ];

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
    notification: typeof mockNotifications[0];
  }> = ({ notification }) => (
    <TouchableOpacity style={styles.notificationItem} activeOpacity={0.8}>
      <BlurView intensity={80} style={styles.notificationBlur}>
        <View style={[
          styles.notificationContent,
          notification.unread && styles.notificationContentUnread
        ]}>
          <View style={styles.notificationLeft}>
            <View style={[styles.notificationIcon, { backgroundColor: notification.color }]}>
              <Ionicons name={notification.icon as any} size={20} color={Colors.white} />
            </View>
            <View style={styles.notificationText}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
          </View>
          {notification.unread && <View style={styles.unreadDot} />}
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

  const filteredNotifications = mockNotifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'invites') return notification.type === 'invite';
    if (activeTab === 'updates') return notification.type === 'update' || notification.type === 'reminder';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
            filteredNotifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
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
              title="Mark All Read"
              icon="checkmark-done"
              onPress={() => {}}
              variant="secondary"
            />
            <GlassButton
              title="Clear All"
              icon="trash"
              onPress={() => {}}
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
});

export default NotificationsScreen; 