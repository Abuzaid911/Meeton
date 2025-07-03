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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import { currentUser } from '../../services/mockData';
import { useAuth } from '../../contexts/AuthContext';
import APIService from '../../services/api';

const { width } = Dimensions.get('window');

interface StatItem {
  icon: string;
  label: string;
  value: string;
  color: string;
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
}

interface ProfileScreenProps {
  navigation: any;
}

type RouteParams = {
  userId?: string;
};

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { signOut, user } = useAuth();
  const route = useRoute();
  const { userId } = (route.params as RouteParams) || {};
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileUser, setProfileUser] = useState(user || currentUser);
  const [loading, setLoading] = useState(false);
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
    if (userId && userId !== user?.id) {
      loadUserProfile();
      loadFriendshipStatus();
    } else {
      // Viewing own profile
      setProfileUser(user || currentUser);
      loadFriendsData();
    }
  }, [userId, user?.id]);

  // Refresh friends data when returning to profile screen
  useFocusEffect(
    React.useCallback(() => {
      if (isOwnProfile) {
        loadFriendsData();
      }
    }, [isOwnProfile])
  );

  const loadFriendsData = async () => {
    if (!isOwnProfile) return;

    try {
      const [friends, requests, suggested] = await Promise.all([
        APIService.getFriends(),
        APIService.getFriendRequests(),
        APIService.getSuggestedFriends()
      ]);

      setFriendsData({
        friends,
        requests,
        suggested
      });
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

  const handleSendFriendRequest = async () => {
    if (!userId) return;
    
    try {
      const result = await APIService.sendFriendRequest(userId);
      if (result.success) {
        Alert.alert('Success', `Friend request sent to ${profileUser.name}!`);
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
          onPress: () => {},
          style: 'success'
        };
      case 'PENDING_SENT':
        return {
          title: 'Request Sent',
          onPress: () => {},
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

  // Stats data (using real friends count for own profile)
  const stats: StatItem[] = [
    {
      icon: 'star',
      label: 'Events Hosted',
      value: '12',
      color: Colors.primary,
    },
    {
      icon: 'calendar',
      label: 'Events Attended',
      value: '34',
      color: Colors.secondary,
    },
    {
      icon: 'people',
      label: 'Friends',
      value: isOwnProfile ? String(friendsData.friends.length) : '158',
      color: Colors.systemGreen,
    },
  ];

  // Menu sections (removed Support section)
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
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          subtitle: 'Update your personal information',
          onPress: () => navigation.navigate('EditProfile'),
          showChevron: true,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy & Security',
          subtitle: 'Manage your account security',
          onPress: () => console.log('Privacy'),
          showChevron: true,
        },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          subtitle: 'Push notifications and alerts',
          onPress: () => setNotificationsEnabled(!notificationsEnabled),
          showChevron: false,
        },
      ],
    },
    {
      title: 'Events',
      items: [
        {
          icon: 'calendar-outline',
          label: 'My Events',
          subtitle: 'Events you\'ve created',
          onPress: () => console.log('My Events'),
          showChevron: true,
        },
        {
          icon: 'bookmark-outline',
          label: 'Saved Events',
          subtitle: 'Events you\'ve bookmarked',
          onPress: () => console.log('Saved Events'),
          showChevron: true,
        },
        {
          icon: 'time-outline',
          label: 'Event History',
          subtitle: 'Past events you attended',
          onPress: () => console.log('Event History'),
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
    <TouchableOpacity style={styles.statCard} activeOpacity={0.8}>
      <BlurView intensity={80} style={styles.statBlur}>
        <View style={styles.statContent}>
          <View style={[styles.statIconContainer, { backgroundColor: stat.color }]}>
            <Ionicons name={stat.icon as any} size={20} color={Colors.white} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
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
                  <Image source={{ uri: profileUser.image }} style={styles.avatar} />
                  <View style={styles.avatarRing} />
                  <TouchableOpacity style={styles.editAvatarButton}>
                    <BlurView intensity={100} style={styles.editAvatarBlur}>
                      <Ionicons name="camera" size={16} color={Colors.white} />
                    </BlurView>
                  </TouchableOpacity>
                </View>
                <Text style={styles.userName}>{profileUser.name}</Text>
                <Text style={styles.userEmail}>{profileUser.email}</Text>
                <Text style={styles.userBio}>
                  {profileUser.bio || 'Event enthusiast • Chicago, IL'}
                </Text>
                
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
                            getFriendButtonConfig().style === 'success' ? styles.friendshipButtonSuccess :
                            getFriendButtonConfig().style === 'secondary' ? styles.friendshipButtonSecondary :
                            styles.friendshipButtonPrimary
                          ]}
                          onPress={getFriendButtonConfig().onPress}
                        >
                          <BlurView intensity={80} style={styles.friendshipButtonBlur}>
                            <Text style={styles.friendshipButtonText}>{getFriendButtonConfig().title}</Text>
                          </BlurView>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.messageButton}>
                          <BlurView intensity={80} style={styles.messageButtonBlur}>
                            <Ionicons name="chatbubble" size={20} color={Colors.white} />
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

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </View>
        </View>

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
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: Colors.primary,
    opacity: 0.8,
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
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
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
});

export default ProfileScreen; 