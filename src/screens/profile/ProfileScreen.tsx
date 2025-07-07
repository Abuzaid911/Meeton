import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import APIService from '../../services/api';
import { notificationService } from '../../services/notificationService';

const { width } = Dimensions.get('window');

interface StatItem {
  icon: string;
  label: string;
  value: string;
  color: string;
  onPress?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
  badge?: number;
}

interface ProfileScreenProps {
  navigation: any;
}

type RouteParams = {
  userId?: string;
  screen?: string;
  params?: any;
};

interface UserStats {
  eventsHosted: number;
  eventsAttended: number;
  friendsCount: number;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { signOut, user } = useAuth();
  const route = useRoute();
  const routeParams = route.params as RouteParams || {};
  
  // Handle nested navigation params (when coming from nested stack)
  let { userId } = routeParams;
  if (routeParams.screen && routeParams.params) {
    userId = (routeParams.params as any)?.userId || userId;
  }
  
  console.log('🔍 ProfileScreen route params:', routeParams);
  console.log('🔍 Full route:', route);
  console.log('🔍 Extracted userId:', userId);
  console.log('🔍 Current user ID:', user?.id);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileUser, setProfileUser] = useState(user);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    eventsHosted: 0,
    eventsAttended: 0,
    friendsCount: 0
  });
  const [otherUserStats, setOtherUserStats] = useState<UserStats>({
    eventsHosted: 0,
    eventsAttended: 0,
    friendsCount: 0
  });
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<{
    status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
    requestId?: string;
  } | null>(null);
  const [friendsData, setFriendsData] = useState<{
    friends: any[];
    requests: { sent: any[]; received: any[] };
    suggested: any[];
  }>({ friends: [], requests: { sent: [], received: [] }, suggested: [] });

  // Check if viewing own profile or someone else's
  const isOwnProfile = !userId || userId === user?.id;

  useEffect(() => {
    console.log('🔍 ProfileScreen loaded with params:', { userId, currentUserId: user?.id, isOwnProfile });
    loadProfileData();
  }, [userId, user?.id]);

  // Refresh data when returning to profile screen
  useFocusEffect(
    React.useCallback(() => {
      if (isOwnProfile) {
        loadFriendsData();
        loadUserStats();
      } else {
        loadOtherUserData();
      }
    }, [isOwnProfile, userId])
  );

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const loadProfileData = async () => {
    if (userId && userId !== user?.id) {
      await Promise.all([
        loadUserProfile(),
        loadFriendshipStatus(),
        loadOtherUserData()
      ]);
    } else {
      // Viewing own profile
      setProfileUser(user);
      await Promise.all([
        loadFriendsData(),
        loadUserStats()
      ]);
    }
  };

  const loadOtherUserData = async () => {
    if (!userId || userId === user?.id) return;

    console.log('📊 Loading data for other user:', userId);

    try {
      // Load user events and friends data in parallel
      const [userEvents, otherUserFriends] = await Promise.all([
        APIService.getUserEvents(userId),
        APIService.getFriends() // This gets current user's friends for mutual friends calculation
      ]);

             // For now, we'll use a placeholder friends count since the API doesn't return it
       // In a real app, you'd have a dedicated API endpoint for user stats
       let otherUserFriendsCount = 0;

      // Set real stats
      if (userEvents) {
        setOtherUserStats({
          eventsHosted: userEvents.hosting.length,
          eventsAttended: userEvents.attending.length,
          friendsCount: otherUserFriendsCount
        });

                 // Create real activities based on their events
         const activities: Array<{
           id: string;
           type: string;
           title: string;
           time: Date;
           icon: string;
           color: string;
         }> = [];
        
        // Add recent hosted events
        const recentHostedEvents = userEvents.hosting
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        
        recentHostedEvents.forEach(event => {
          activities.push({
            id: `hosted-${event.id}`,
            type: 'event_hosted',
            title: `Hosted "${event.name}"`,
            time: new Date(event.date),
            icon: 'calendar',
            color: Colors.primary
          });
        });

        // Add recent attended events
        const recentAttendedEvents = userEvents.attending
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);
        
        recentAttendedEvents.forEach(event => {
          activities.push({
            id: `attended-${event.id}`,
            type: 'event_attended',
            title: `Attended "${event.name}"`,
            time: new Date(event.date),
            icon: 'checkmark-circle',
            color: Colors.systemGreen
          });
        });

        // Sort all activities by date and take the most recent 5
        const sortedActivities = activities
          .sort((a, b) => b.time.getTime() - a.time.getTime())
          .slice(0, 5);

        setUserActivities(sortedActivities);
      }

      // Calculate mutual friends
      if (otherUserFriends && Array.isArray(otherUserFriends)) {
        // In a real app, you'd have an API endpoint for mutual friends
        // For now, we'll show a subset as "mutual friends"
        const mutualFriendsSubset = otherUserFriends.slice(0, 4);
        setMutualFriends(mutualFriendsSubset);
      }

    } catch (error) {
      console.error('Error loading other user data:', error);
    }
  };

  const loadUserStats = async () => {
    if (!isOwnProfile || !user?.id) return;

    try {
      const userEvents = await APIService.getUserEvents(user.id);
      if (userEvents) {
        setUserStats({
          eventsHosted: userEvents.hosting.length,
          eventsAttended: userEvents.attending.length,
          friendsCount: friendsData.friends.length
        });
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const loadFriendsData = async () => {
    if (!isOwnProfile) return;

    try {
      const [friends, requests, suggested] = await Promise.all([
        APIService.getFriends(),
        APIService.getFriendRequests(),
        APIService.getSuggestedFriends()
      ]);

      const friendsData = {
        friends: friends || [],
        requests: requests || { sent: [], received: [] },
        suggested: suggested || []
      };

      setFriendsData(friendsData);
      
      // Update friends count in stats
      setUserStats(prev => ({
        ...prev,
        friendsCount: friendsData.friends.length
      }));
    } catch (error) {
      console.error('Failed to load friends data:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const userProfile = await APIService.getUserProfile(userId);
      if (userProfile) {
        setProfileUser(userProfile as any);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendshipStatus = async () => {
    if (!userId || userId === user?.id) return;
    
    try {
      const status = await APIService.getFriendshipStatus(userId);
      setFriendshipStatus(status);
    } catch (error) {
      console.error('Failed to load friendship status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfileData();
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!userId) return;
    
    try {
      const result = await APIService.sendFriendRequest(userId);
      if (result.success) {
        Alert.alert('Success', `Friend request sent to ${profileUser?.name}!`);
        setFriendshipStatus({ status: 'PENDING_SENT' });
      } else {
        Alert.alert('Error', result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendshipStatus?.requestId) return;
    
    try {
      const result = await APIService.respondToFriendRequest(friendshipStatus.requestId, 'ACCEPTED');
      if (result.success) {
        Alert.alert('Success', 'Friend request accepted!');
        setFriendshipStatus({ status: 'FRIENDS' });
      } else {
        Alert.alert('Error', result.error || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineFriendRequest = async () => {
    if (!friendshipStatus?.requestId) return;
    
    try {
      const result = await APIService.respondToFriendRequest(friendshipStatus.requestId, 'DECLINED');
      if (result.success) {
        Alert.alert('Success', 'Friend request declined');
        setFriendshipStatus({ status: 'NONE' });
      } else {
        Alert.alert('Error', result.error || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async () => {
    if (!userId) return;
    
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${profileUser?.name} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await APIService.removeFriend(userId);
              if (success) {
                Alert.alert('Success', 'Friend removed successfully');
                setFriendshipStatus({ status: 'NONE' });
              } else {
                Alert.alert('Error', 'Failed to remove friend');
              }
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend');
            }
          }
        }
      ]
    );
  };

  const handleCancelFriendRequest = async () => {
    if (!userId) return;
    
    Alert.alert(
      'Cancel Friend Request',
      `Are you sure you want to cancel your friend request to ${profileUser?.name}?`,
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await APIService.cancelFriendRequest(userId);
              if (success) {
                Alert.alert('Success', 'Friend request cancelled');
                setFriendshipStatus({ status: 'NONE' });
              } else {
                Alert.alert('Error', 'Failed to cancel friend request');
              }
            } catch (error) {
              console.error('Error cancelling friend request:', error);
              Alert.alert('Error', 'Failed to cancel friend request');
            }
          }
        }
      ]
    );
  };

  const getFriendButtonConfig = () => {
    if (!friendshipStatus) {
      return {
        title: 'Add Friend',
        onPress: handleSendFriendRequest,
        style: 'primary'
      };
    }

    switch (friendshipStatus.status) {
      case 'FRIENDS':
        return {
          title: 'Friends ✓',
          onPress: handleRemoveFriend,
          style: 'success'
        };
      case 'PENDING_SENT':
        return {
          title: 'Cancel Request',
          onPress: handleCancelFriendRequest,
          style: 'secondary'
        };
      case 'PENDING_RECEIVED':
        return {
          title: 'Accept Request',
          onPress: handleAcceptFriendRequest,
          style: 'primary'
        };
      case 'NONE':
      default:
        return {
          title: 'Add Friend',
          onPress: handleSendFriendRequest,
          style: 'primary'
        };
    }
  };

  const handleViewMyEvents = () => {
    navigation.navigate('Home', { 
      screen: 'HomeMain',
      params: { 
        filter: 'my-events',
        title: 'My Events'
      }
    });
  };

  const handleViewHostedEvents = () => {
    navigation.navigate('Home', { 
      screen: 'HomeMain',
      params: { 
        filter: 'hosted',
        title: 'Events I\'m Hosting'
      }
    });
  };

  const handleViewAttendingEvents = () => {
    navigation.navigate('Home', { 
      screen: 'HomeMain',
      params: { 
        filter: 'attending',
        title: 'Events I\'m Attending'
      }
    });
  };

  const handleTestNotification = async () => {
    try {
      console.log('🔔 Testing notification...');
      
      // Check if notifications are enabled
      const isEnabled = await notificationService.isEnabled();
      if (!isEnabled) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to test notifications.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // This would ideally open settings, but we'll just show instructions
              Alert.alert(
                'Enable Notifications',
                'Go to Settings > Notifications > MeetOn to enable notifications',
                [{ text: 'OK' }]
              );
            }},
          ]
        );
        return;
      }

      // Schedule a test notification
      await notificationService.scheduleLocalNotification(
        'Test Notification 🎉',
        'This is a test notification from MeetOn!',
        { seconds: 2 }
      );

      Alert.alert(
        'Test Notification Sent',
        'You should receive a test notification in 2 seconds!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error testing notification:', error);
      Alert.alert(
        'Error',
        'Failed to send test notification. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Stats data with real numbers and navigation
  const stats: StatItem[] = [
    {
      icon: 'calendar',
      label: 'Events Hosted',
      value: String(userStats.eventsHosted),
      color: Colors.primary,
      onPress: handleViewHostedEvents,
    },
    {
      icon: 'checkmark-circle',
      label: 'Events Attended',
      value: String(userStats.eventsAttended),
      color: Colors.secondary,
      onPress: handleViewAttendingEvents,
    },
    {
      icon: 'people',
      label: 'Friends',
      value: String(userStats.friendsCount),
      color: Colors.systemGreen,
      onPress: () => navigation.navigate('Friends', { tab: 'friends' }),
    },
  ];

  // Menu sections with real data counts and badges
  const menuSections: MenuSection[] = [
    {
      title: 'Friends',
      items: [
        {
          icon: 'people',
          label: 'My Friends',
          subtitle: `${friendsData.friends.length} friends`,
          onPress: () => navigation.navigate('Friends', { tab: 'friends' }),
          showChevron: true,
        },
        {
          icon: 'person-add',
          label: 'Friend Requests',
          subtitle: `${friendsData.requests.received.length} pending requests`,
          onPress: () => navigation.navigate('Friends', { tab: 'requests' }),
          showChevron: true,
          badge: friendsData.requests.received.length > 0 ? friendsData.requests.received.length : undefined,
        },
        {
          icon: 'people-outline',
          label: 'Suggestions',
          subtitle: `${friendsData.suggested.length} people you may know`,
          onPress: () => navigation.navigate('Friends', { tab: 'suggestions' }),
          showChevron: true,
        },
        {
          icon: 'paper-plane-outline',
          label: 'Sent Requests',
          subtitle: `${friendsData.requests.sent.length} pending`,
          onPress: () => navigation.navigate('Friends', { tab: 'sent' }),
          showChevron: true,
          badge: friendsData.requests.sent.length > 0 ? friendsData.requests.sent.length : undefined,
        },
      ],
    },
    {
      title: 'Events',
      items: [
        {
          icon: 'calendar-outline',
          label: 'My Events',
          subtitle: 'All events (hosting & attending)',
          onPress: handleViewMyEvents,
          showChevron: true,
        },
        {
          icon: 'star-outline',
          label: 'Hosting',
          subtitle: `${userStats.eventsHosted} events you're hosting`,
          onPress: handleViewHostedEvents,
          showChevron: true,
        },
        {
          icon: 'checkmark-circle-outline',
          label: 'Attending',
          subtitle: `${userStats.eventsAttended} events you're attending`,
          onPress: handleViewAttendingEvents,
          showChevron: true,
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Sign Out',
          onPress: signOut,
          showChevron: false,
          isDestructive: true,
        },
      ],
    },
  ];

  const StatCard: React.FC<{ stat: StatItem; index: number }> = ({ stat, index }) => (
    <TouchableOpacity 
      style={styles.statCard} 
      activeOpacity={stat.onPress ? 0.8 : 1}
      onPress={stat.onPress}
    >
      <BlurView intensity={80} style={styles.statBlur}>
        <View style={styles.statContent}>
          <View style={[styles.statIconContainer, { backgroundColor: stat.color }]}>
            <Ionicons name={stat.icon as any} size={20} color={Colors.white} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
          {stat.onPress && (
            <View style={styles.statTapIndicator}>
              <Ionicons name="chevron-forward" size={12} color="rgba(255, 255, 255, 0.5)" />
            </View>
          )}
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const MenuItemComponent: React.FC<{ item: MenuItem }> = ({ item }) => (
    <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, item.isDestructive && styles.destructiveIcon]}>
          <Ionicons 
            name={item.icon as any} 
            size={20} 
            color={item.isDestructive ? Colors.systemRed : Colors.white} 
          />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuItemTitle, item.isDestructive && styles.destructiveText]}>
            {item.label}
          </Text>
          {item.subtitle && (
            <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {item.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        {item.label === 'Notifications' && (
          <View style={[styles.toggle, notificationsEnabled && styles.toggleActive]}>
            <View style={[styles.toggleThumb, notificationsEnabled && styles.toggleThumbActive]} />
          </View>
        )}
        {item.showChevron && (
          <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.6)" />
        )}
      </View>
    </TouchableOpacity>
  );

  const MenuSectionComponent: React.FC<{ section: MenuSection }> = ({ section }) => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <BlurView intensity={80} style={styles.menuSectionBlur}>
        <View style={styles.menuSectionContainer}>
          {section.items.map((item, index) => (
            <View key={index}>
              <MenuItemComponent item={item} />
              {index < section.items.length - 1 && <View style={styles.menuItemSeparator} />}
            </View>
          ))}
        </View>
      </BlurView>
    </View>
  );

  if (loading && !profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header for other user's profile */}
      {!isOwnProfile && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 44 }} />
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, !isOwnProfile && { paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.white}
            titleColor={Colors.white}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <BlurView intensity={60} style={styles.profileHeaderBlur}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.profileHeaderGradient}
            >
              <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ 
                      uri: profileUser?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.name || 'User')}&background=667eea&color=fff&size=150`
                    }} 
                    style={styles.avatar} 
                  />
                </View>
                <Text style={styles.userName}>{profileUser?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{profileUser?.email}</Text>
                <Text style={styles.userBio}>
                  {profileUser?.bio || (isOwnProfile ? 'Add a bio to tell others about yourself' : 'No bio available')}
                </Text>
                {profileUser?.location && (
                  <Text style={styles.userLocation}>
                    <Ionicons name="location-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
                    {' '}{profileUser.location}
                  </Text>
                )}
                
                {isOwnProfile ? (
                  <TouchableOpacity 
                    style={styles.editProfileButton}
                    onPress={() => navigation.navigate('EditProfile')}
                  >
                    <BlurView intensity={80} style={styles.editProfileBlur}>
                      <Text style={styles.editProfileText}>Edit Profile</Text>
                    </BlurView>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.friendshipActions}>
                    {friendshipStatus?.status === 'PENDING_RECEIVED' ? (
                      // Show Accept and Decline buttons for pending received requests
                      <>
                        <TouchableOpacity 
                          style={[styles.friendshipButton, styles.friendshipButtonPrimary]}
                          onPress={handleAcceptFriendRequest}
                        >
                          <BlurView intensity={80} style={styles.friendshipButtonBlur}>
                            <Text style={styles.friendshipButtonText}>Accept</Text>
                          </BlurView>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.messageButton, styles.declineButton]}
                          onPress={handleDeclineFriendRequest}
                        >
                          <BlurView intensity={80} style={styles.messageButtonBlur}>
                            <Ionicons name="close" size={20} color={Colors.white} />
                          </BlurView>
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Show single action button and message button for other states
                      <>
                        <TouchableOpacity 
                          style={[
                            styles.friendshipButton,
                            styles.friendshipButtonFullWidth,
                            friendshipStatus?.status === 'FRIENDS' 
                              ? styles.friendshipButtonSuccess
                              : friendshipStatus?.status === 'PENDING_SENT'
                              ? styles.friendshipButtonSecondary
                              : styles.friendshipButtonPrimary
                          ]}
                          onPress={getFriendButtonConfig().onPress}
                        >
                          <BlurView intensity={80} style={styles.friendshipButtonBlur}>
                            <Text style={styles.friendshipButtonText}>
                              {getFriendButtonConfig().title}
                            </Text>
                          </BlurView>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Stats Section - Show different stats for other users */}
        {!isOwnProfile && profileUser && (
          <View style={styles.statsSection}>
            <View style={[styles.statsContainer, { justifyContent: 'space-around' }]}>
              <View style={[styles.statCard, { width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3 }]}>
                <BlurView intensity={60} style={styles.statBlur}>
                  <View style={styles.statContent}>
                    <View style={[styles.statIconContainer, { backgroundColor: Colors.primary }]}>
                      <Ionicons name="calendar" size={20} color={Colors.white} />
                    </View>
                    <Text style={styles.statValue}>
                      {otherUserStats.eventsHosted}
                    </Text>
                    <Text style={styles.statLabel}>Events Hosted</Text>
                  </View>
                </BlurView>
              </View>
              
              <View style={[styles.statCard, { width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3 }]}>
                <BlurView intensity={60} style={styles.statBlur}>
                  <View style={styles.statContent}>
                    <View style={[styles.statIconContainer, { backgroundColor: Colors.secondary }]}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    </View>
                    <Text style={styles.statValue}>
                      {otherUserStats.eventsAttended}
                    </Text>
                    <Text style={styles.statLabel}>Events Attended</Text>
                  </View>
                </BlurView>
              </View>

              <View style={[styles.statCard, { width: (width - Spacing.lg * 2 - Spacing.md * 2) / 3 }]}>
                <BlurView intensity={60} style={styles.statBlur}>
                  <View style={styles.statContent}>
                    <View style={[styles.statIconContainer, { backgroundColor: Colors.systemGreen }]}>
                      <Ionicons name="people" size={20} color={Colors.white} />
                    </View>
                    <Text style={styles.statValue}>
                      {otherUserStats.friendsCount}
                    </Text>
                    <Text style={styles.statLabel}>Friends</Text>
                  </View>
                </BlurView>
              </View>
            </View>
          </View>
        )}

        {/* User Info Section - Enhanced for other users */}
        {!isOwnProfile && profileUser && (
          <>


            {/* Recent Activity Section */}
            <View style={styles.userInfoSection}>
              <BlurView intensity={60} style={styles.userInfoBlur}>
                <View style={styles.userInfoContent}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <View style={styles.activityList}>
                    {userActivities.length > 0 ? (
                      userActivities.map((activity) => (
                        <View key={activity.id} style={styles.activityItem}>
                          <View style={[styles.activityIcon, { backgroundColor: activity.color }]}>
                            <Ionicons name={activity.icon as any} size={16} color={Colors.white} />
                          </View>
                          <View style={styles.activityContent}>
                            <Text style={styles.activityTitle}>{activity.title}</Text>
                            <Text style={styles.activityTime}>{getRelativeTime(activity.time)}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataText}>No recent activity</Text>
                    )}
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Mutual Friends Section */}
            <View style={styles.userInfoSection}>
              <BlurView intensity={60} style={styles.userInfoBlur}>
                <View style={styles.userInfoContent}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Mutual Friends</Text>
                    {mutualFriends.length > 4 && (
                      <TouchableOpacity onPress={() => navigation.navigate('Friends', { tab: 'mutual', userId })}>
                        <Text style={styles.sectionAction}>View All</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.mutualFriends}>
                    {mutualFriends.length > 0 ? (
                      <>
                        {mutualFriends.slice(0, 4).map((friend, index) => (
                          <TouchableOpacity 
                            key={friend.id} 
                            style={styles.mutualFriendItem}
                            onPress={() => navigation.navigate('UserProfile', { userId: friend.id })}
                          >
                            <Image
                              source={{ 
                                uri: friend.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=667eea&color=fff&size=60` 
                              }}
                              style={styles.mutualFriendAvatar}
                            />
                            <Text style={styles.mutualFriendName}>{friend.name}</Text>
                          </TouchableOpacity>
                        ))}
                        {mutualFriends.length > 4 && (
                          <TouchableOpacity 
                            style={styles.mutualFriendMore}
                            onPress={() => navigation.navigate('Friends', { tab: 'mutual', userId })}
                          >
                            <View style={styles.mutualFriendMoreIcon}>
                              <Text style={styles.mutualFriendMoreText}>+{mutualFriends.length - 4}</Text>
                            </View>
                            <Text style={styles.mutualFriendName}>More</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noDataText}>No mutual friends</Text>
                    )}
                  </View>
                </View>
              </BlurView>
            </View>
          </>
        )}

        {/* Stats Section - Only show for own profile */}
        {isOwnProfile && (
          <View style={styles.statsSection}>
            <View style={styles.statsContainer}>
              {stats.map((stat, index) => (
                <StatCard key={index} stat={stat} index={index} />
              ))}
            </View>
          </View>
        )}

        {/* Menu Sections - Only show for own profile */}
        {isOwnProfile && (
          <View style={styles.menuContainer}>
            {menuSections.map((section, index) => (
              <MenuSectionComponent key={index} section={section} />
            ))}
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
  profileHeader: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  profileHeaderBlur: {
    borderRadius: BorderRadius.xl,
  },
  profileHeaderGradient: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileInfo: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  avatarRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 66,
    borderWidth: 3,
    borderColor: Colors.primary,
    opacity: 0.9,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  editAvatarBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.sm,
  },
  userBio: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  userLocation: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minWidth: 120,
  },
  editProfileBlur: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  editProfileText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    height: 100,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  statBlur: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  statContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  statTapIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 2,
  },
  menuContainer: {
    paddingHorizontal: Spacing.lg,
  },
  menuSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSectionBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  menuSectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  destructiveIcon: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.white,
    marginBottom: 2,
  },
  destructiveText: {
    color: Colors.systemRed,
  },
  menuItemSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  menuItemRight: {
    alignItems: 'center',
  },
  menuItemSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 64,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Header styles for other user's profile
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  // Friendship action styles
  friendshipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  friendshipButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minWidth: 120,
  },
  friendshipButtonFullWidth: {
    flex: 0,
    width: '100%',
  },
  friendshipButtonPrimary: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  friendshipButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendshipButtonSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  friendshipButtonBlur: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendshipButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  messageButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  loadingText: {
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.systemRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  // New styles for enhanced user info sections
  userInfoSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  userInfoBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  userInfoContent: {
    padding: Spacing.lg,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  interestTagText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  noDataText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  activityList: {
    marginTop: Spacing.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  activityTime: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  mutualFriends: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  mutualFriendItem: {
    alignItems: 'center',
  },
  mutualFriendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  mutualFriendName: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  mutualFriendMore: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  mutualFriendMoreIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mutualFriendMoreText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  actionButtonsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  actionButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  // New styles for section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionAction: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
});

export default ProfileScreen; 