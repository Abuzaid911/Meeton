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
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import APIService from '../../services/api';
import { RSVP } from '../../types';

const { width } = Dimensions.get('window');

interface UserProfileScreenProps {
  navigation: any;
}

type RouteParams = {
  userId: string;
};

interface UserStats {
  eventsHosted: number;
  eventsAttended: number;
  friendsCount: number;
}

interface Activity {
  id: string;
  type: 'event_hosted' | 'event_attended' | 'rsvp_changed';
  title: string;
  subtitle?: string;
  time: Date;
  icon: string;
  color: string;
}

const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ navigation }) => {
  const { user: currentUser } = useAuth();
  const route = useRoute();
  const { userId } = route.params as RouteParams;
  
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    eventsHosted: 0,
    eventsAttended: 0,
    friendsCount: 0
  });
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<{
    status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
    requestId?: string;
  } | null>(null);

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load all user data in parallel
      const [
        userProfile,
        userEventsData,
        friendshipStatusData,
        currentUserFriends
      ] = await Promise.all([
        APIService.getUserProfile(userId),
        APIService.getUserEvents(userId),
        APIService.getFriendshipStatus(userId),
        APIService.getFriends() // For mutual friends calculation
      ]);

      if (userProfile) {
        setProfileUser(userProfile);
      }

      if (userEventsData) {
        const allEvents = [...userEventsData.hosting, ...userEventsData.attending];
        setUserEvents(allEvents);
        
        setUserStats({
          eventsHosted: userEventsData.hosting.length,
          eventsAttended: userEventsData.attending.length,
          friendsCount: 0 // Will be updated when we get friends data
        });

        // Generate recent activities from events
        generateRecentActivities(userEventsData);
      }

      if (friendshipStatusData) {
        setFriendshipStatus(friendshipStatusData);
      }

      // Get real friends data for the user
      const userFriendsData = await APIService.getUserFriends(userId);
      setUserFriends(userFriendsData);

      // Calculate mutual friends
      if (currentUserFriends && Array.isArray(currentUserFriends) && userFriendsData.length > 0) {
        const currentUserFriendIds = new Set(currentUserFriends.map(f => f.id));
        const mutualFriendsData = userFriendsData.filter(friend => currentUserFriendIds.has(friend.id));
        setMutualFriends(mutualFriendsData);
      }
      
      setUserStats(prev => ({
        ...prev,
        friendsCount: userFriendsData.length
      }));

    } catch (error) {
      console.error('Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivities = (eventsData: any) => {
    const activities: Activity[] = [];
    
    // Add recent hosted events
    eventsData.hosting
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .forEach((event: any) => {
        activities.push({
          id: `hosted-${event.id}`,
          type: 'event_hosted',
          title: `Hosting "${event.name}"`,
          subtitle: formatEventDate(event.date),
          time: new Date(event.date),
          icon: 'calendar',
          color: Colors.primary
        });
      });

    // Add recent attended events  
    eventsData.attending
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .forEach((event: any) => {
        activities.push({
          id: `attended-${event.id}`,
          type: 'event_attended',
          title: `Attending "${event.name}"`,
          subtitle: formatEventDate(event.date),
          time: new Date(event.date),
          icon: 'checkmark-circle',
          color: Colors.systemGreen
        });
      });

    // Sort all activities by date and take most recent 5
    const sortedActivities = activities
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 5);

    setRecentActivities(sortedActivities);
  };

  const formatEventDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    // if (diffDays < 7) return `${diffDays} days ago`;
    // if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    // return `${Math.floor(diffDays / 30)} months ago`;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleSendFriendRequest = async () => {
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
        // Reload profile to update mutual friends
        loadUserProfile();
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

  const handleCancelFriendship = async () => {
    Alert.alert(
      'Cancel Friendship',
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
                loadUserProfile(); // Reload to update data
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

  const handleEventPress = (eventId: string) => {
    navigation.navigate('Home', {
      screen: 'EventDetails',
      params: { eventId }
    });
  };

  const handleFriendPress = (friendId: string) => {
    if (friendId !== currentUser?.id) {
      navigation.push('UserProfile', { userId: friendId });
    }
  };

  const renderEventCard = ({ item: event }: { item: any }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => handleEventPress(event.id)}
    >
      <BlurView intensity={60} style={styles.eventCardBlur}>
        <View style={styles.eventCardContent}>
          {event.headerImageUrl ? (
            <Image source={{ uri: event.headerImageUrl }} style={styles.eventImage} />
          ) : (
            <View style={[styles.eventImagePlaceholder, { backgroundColor: event.headerColor || Colors.primary }]} />
          )}
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
            <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
            <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderFriend = ({ item: friend }: { item: any }) => (
    <TouchableOpacity 
      style={styles.friendItem}
      onPress={() => handleFriendPress(friend.id)}
    >
      <Image source={{ uri: friend.image }} style={styles.friendAvatar} />
      <Text style={styles.friendName} numberOfLines={1}>{friend.name}</Text>
    </TouchableOpacity>
  );

  const renderActivity = ({ item: activity }: { item: Activity }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: activity.color }]}>
        <Ionicons name={activity.icon as any} size={16} color={Colors.white} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        {activity.subtitle && (
          <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
        )}
        <Text style={styles.activityTime}>{getRelativeTime(activity.time)}</Text>
      </View>
    </View>
  );

  const getFriendshipActionButtons = () => {
    if (!friendshipStatus) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleSendFriendRequest}>
          <Ionicons name="person-add" size={20} color={Colors.white} />
          <Text style={styles.actionButtonText}>Send Friend Request</Text>
        </TouchableOpacity>
      );
    }

    switch (friendshipStatus.status) {
      case 'FRIENDS':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleCancelFriendship}>
            <Ionicons name="person-remove" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Cancel Friendship</Text>
          </TouchableOpacity>
        );
      
      case 'PENDING_SENT':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleCancelFriendRequest}>
            <Ionicons name="close" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Cancel Request</Text>
          </TouchableOpacity>
        );
      
      case 'PENDING_RECEIVED':
        return (
          <View style={styles.actionButtonRow}>
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton, { flex: 1, marginRight: Spacing.sm }]} onPress={handleAcceptFriendRequest}>
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.dangerButton, { flex: 1, marginLeft: Spacing.sm }]} onPress={handleDeclineFriendRequest}>
              <Ionicons name="close" size={20} color={Colors.white} />
              <Text style={styles.actionButtonText}>Refuse</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'NONE':
      default:
        return (
          <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleSendFriendRequest}>
            <Ionicons name="person-add" size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Send Friend Request</Text>
          </TouchableOpacity>
        );
    }
  };

  if (loading) {
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

  if (!profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
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
                      uri: profileUser.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name || 'User')}&background=667eea&color=fff&size=150`
                    }} 
                    style={styles.avatar} 
                  />
                </View>
                <Text style={styles.userName}>{profileUser.name || 'User'}</Text>
                <Text style={styles.userBio}>
                  {profileUser.bio || 'No bio available'}
                </Text>
                {profileUser.location && (
                  <Text style={styles.userLocation}>
                    <Ionicons name="location-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
                    {' '}{profileUser.location}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <BlurView intensity={60} style={styles.statBlur}>
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: Colors.primary }]}>
                    <Ionicons name="calendar" size={20} color={Colors.white} />
                  </View>
                  <Text style={styles.statValue}>{userStats.eventsHosted}</Text>
                  <Text style={styles.statLabel}>Events Hosted</Text>
                </View>
              </BlurView>
            </View>
            
            <View style={styles.statCard}>
              <BlurView intensity={60} style={styles.statBlur}>
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: Colors.secondary }]}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  </View>
                  <Text style={styles.statValue}>{userStats.eventsAttended}</Text>
                  <Text style={styles.statLabel}>Events Attended</Text>
                </View>
              </BlurView>
            </View>

            <View style={styles.statCard}>
              <BlurView intensity={60} style={styles.statBlur}>
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: Colors.systemGreen }]}>
                    <Ionicons name="people" size={20} color={Colors.white} />
                  </View>
                  <Text style={styles.statValue}>{userStats.friendsCount}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </View>
              </BlurView>
            </View>
          </View>
        </View>

        {/* Events Section */}
        {/* {userEvents.length > 0 && (
          <View style={styles.section}>
            <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Events ({userEvents.length})</Text>
                <FlatList
                  data={userEvents.slice(0, 10)} // Show max 10 events
                  renderItem={renderEventCard}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsListContainer}
                />
              </View>
            </BlurView>
          </View>
        )} */}

        {/* Friends Section */}
        {userFriends.length > 0 && (
          <View style={styles.section}>
            <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Friends ({userFriends.length})</Text>
                <FlatList
                  data={userFriends}
                  renderItem={renderFriend}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsListContainer}
                />
              </View>
            </BlurView>
          </View>
        )}

        {/* Recent Activity Section */}
        {recentActivities.length > 0 && (
          <View style={styles.section}>
            <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <View style={styles.activitiesList}>
                  {recentActivities.map((activity) => (
                    <View key={activity.id}>
                      {renderActivity({ item: activity })}
                    </View>
                  ))}
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* Mutual Friends Section */}
        {mutualFriends.length > 0 && (
          <View style={styles.section}>
            <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>Mutual Friends ({mutualFriends.length})</Text>
                <FlatList
                  data={mutualFriends}
                  renderItem={renderFriend}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.friendsListContainer}
                />
              </View>
            </BlurView>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <BlurView intensity={80} tint="dark" style={styles.actionSectionBlur}>
            <View style={styles.actionSectionContent}>
              {getFriendshipActionButtons()}
            </View>
          </BlurView>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerBackButton: {
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
  scrollView: {
    flex: 1,
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
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  userBio: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  userLocation: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
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
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  sectionBlur: {
    borderRadius: 20,
  },
  sectionContent: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  eventsListContainer: {
    gap: Spacing.md,
  },
  eventCard: {
    width: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  eventCardBlur: {
    borderRadius: BorderRadius.lg,
  },
  eventCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventImage: {
    width: '100%',
    height: 100,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 100,
  },
  eventInfo: {
    padding: Spacing.md,
  },
  eventName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  eventDate: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  eventLocation: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  friendsListContainer: {
    gap: Spacing.md,
  },
  friendItem: {
    alignItems: 'center',
    width: 80,
  },
  friendAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.white,
    marginBottom: Spacing.xs,
  },
  friendName: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  activitiesList: {
    gap: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    marginBottom: Spacing.xs / 2,
  },
  activitySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    marginBottom: Spacing.xs / 2,
  },
  activityTime: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actionSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  actionSectionBlur: {
    borderRadius: 20,
  },
  actionSectionContent: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.medium,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  dangerButton: {
    backgroundColor: Colors.systemRed,
  },
  actionButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  backButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  bottomSpacing: {
    height: 50,
  },
});

export default UserProfileScreen; 