import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../../constants';
import { Notification, NotificationSourceType, User } from '../../types';

interface ActivityCardProps {
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onQuickAction?: (action: 'accept' | 'decline') => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
  onQuickAction,
}) => {
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

  const getNotificationTitle = (sourceType: NotificationSourceType): string => {
    return sourceType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const showQuickActions = 
    notification.sourceType === NotificationSourceType.FRIEND_REQUEST ||
    notification.sourceType === NotificationSourceType.PRIVATE_INVITATION ||
    notification.sourceType === NotificationSourceType.ATTENDEE;

  const handleLongPress = () => {
    Alert.alert(
      'Activity Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: notification.isRead ? 'Mark as Unread' : 'Mark as Read',
          onPress: onMarkAsRead
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete
        }
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.8}
      onPress={() => {
        if (!notification.isRead) {
          onMarkAsRead();
        }
        onPress();
      }}
      onLongPress={handleLongPress}
    >
      <BlurView intensity={80} style={styles.blurView}>
        <View style={[
          styles.content,
          !notification.isRead && styles.contentUnread
        ]}>
          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Icon or Avatar */}
            <View style={styles.iconContainer}>
              {notification.targetUser?.image ? (
                <Image 
                  source={{ uri: notification.targetUser.image }} 
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[
                  styles.iconCircle, 
                  { backgroundColor: getNotificationColor(notification.sourceType) }
                ]}>
                  <Ionicons 
                    name={getNotificationIcon(notification.sourceType) as any} 
                    size={20} 
                    color={Colors.white} 
                  />
                </View>
              )}
            </View>

            {/* Text Content */}
            <View style={styles.textContent}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  {getNotificationTitle(notification.sourceType)}
                </Text>
                <Text style={styles.time}>
                  {getRelativeTime(notification.createdAt)}
                </Text>
              </View>
              
              <Text style={styles.message} numberOfLines={2}>
                {notification.message}
              </Text>

              {/* Quick Actions */}
              {showQuickActions && onQuickAction && (
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => onQuickAction('accept')}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => onQuickAction('decline')}
                  >
                    <Ionicons name="close" size={16} color={Colors.white} />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Unread Indicator */}
            {!notification.isRead && <View style={styles.unreadDot} />}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  blurView: {
    borderRadius: BorderRadius.lg,
  },
  content: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentUnread: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  time: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  message: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  declineButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  actionButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 2,
    marginLeft: Spacing.sm,
  },
});

export default ActivityCard; 