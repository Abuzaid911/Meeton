import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  SectionListData,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import { Notification } from '../../types';
import ActivityCard from './ActivityCard';

interface ActivityTimelineProps {
  notifications: Notification[];
  onNotificationPress: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onQuickAction?: (notificationId: string, action: 'accept' | 'decline') => void;
}

interface TimelineSection {
  title: string;
  data: Notification[];
  icon: string;
  color: string;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  notifications,
  onNotificationPress,
  onMarkAsRead,
  onDelete,
  onQuickAction,
}) => {
  const groupNotificationsByDate = (notifications: Notification[]): TimelineSection[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: { [key: string]: Notification[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt);
      const notificationDay = new Date(notificationDate.getFullYear(), notificationDate.getMonth(), notificationDate.getDate());

      if (notificationDay.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notificationDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notificationDate >= thisWeek) {
        groups.thisWeek.push(notification);
      } else if (notificationDate >= thisMonth) {
        groups.thisMonth.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    const sections: TimelineSection[] = [];

    if (groups.today.length > 0) {
      sections.push({
        title: 'Today',
        data: groups.today,
        icon: 'today',
        color: Colors.primary,
      });
    }

    if (groups.yesterday.length > 0) {
      sections.push({
        title: 'Yesterday',
        data: groups.yesterday,
        icon: 'calendar',
        color: Colors.systemOrange,
      });
    }

    if (groups.thisWeek.length > 0) {
      sections.push({
        title: 'This Week',
        data: groups.thisWeek,
        icon: 'calendar-outline',
        color: Colors.systemBlue,
      });
    }

    if (groups.thisMonth.length > 0) {
      sections.push({
        title: 'This Month',
        data: groups.thisMonth,
        icon: 'calendar-outline',
        color: Colors.systemGreen,
      });
    }

    if (groups.older.length > 0) {
      sections.push({
        title: 'Older',
        data: groups.older,
        icon: 'archive',
        color: Colors.gray,
      });
    }

    return sections;
  };

  const sections = groupNotificationsByDate(notifications);

  const renderSectionHeader = ({ section }: { section: SectionListData<Notification, TimelineSection> }) => (
    <View style={styles.sectionHeader}>
      <BlurView intensity={60} style={styles.sectionHeaderBlur}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: section.color }]}>
              <Ionicons name={section.icon as any} size={16} color={Colors.white} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={styles.itemContainer}>
      <ActivityCard
        notification={item}
        onPress={() => onNotificationPress(item)}
        onMarkAsRead={() => onMarkAsRead(item.id)}
        onDelete={() => onDelete(item.id)}
        onQuickAction={onQuickAction ? (action) => onQuickAction(item.id, action) : undefined}
      />
    </View>
  );

  const renderSectionFooter = ({ section }: { section: SectionListData<Notification, TimelineSection> }) => {
    const unreadCount = section.data.filter(n => !n.isRead).length;
    
    if (unreadCount === 0) return null;

    return (
      <View style={styles.sectionFooter}>
        <View style={styles.unreadIndicator}>
          <View style={styles.unreadDot} />
          <Text style={styles.unreadText}>
            {unreadCount} unread {unreadCount === 1 ? 'activity' : 'activities'}
          </Text>
        </View>
      </View>
    );
  };

  if (sections.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <BlurView intensity={60} style={styles.emptyIconBlur}>
            <View style={styles.emptyIconContent}>
              <Ionicons name="notifications-off" size={48} color="rgba(255, 255, 255, 0.6)" />
            </View>
          </BlurView>
        </View>
        <Text style={styles.emptyTitle}>No Activity</Text>
        <Text style={styles.emptySubtitle}>
          Your activity timeline will appear here when you have notifications.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={true}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={null}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionHeaderBlur: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sectionBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  itemContainer: {
    marginBottom: 0, // ActivityCard has its own margin
  },
  sectionFooter: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  unreadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  unreadText: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
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
});

export default ActivityTimeline; 