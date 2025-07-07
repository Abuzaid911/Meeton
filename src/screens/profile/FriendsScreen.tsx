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
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import APIService from '../../services/api';

interface FriendsScreenProps {
  navigation: any;
}

type RouteParams = {
  tab?: 'friends' | 'requests' | 'suggestions' | 'sent';
};

type FriendsData = {
  friends: any[];
  requests: { sent: any[]; received: any[] };
  suggested: any[];
};

const FriendsScreen: React.FC<FriendsScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { tab = 'friends' } = (route.params as RouteParams) || {};
  
  const [activeTab, setActiveTab] = useState(tab);
  const [loading, setLoading] = useState(true);
  const [friendsData, setFriendsData] = useState<FriendsData>({
    friends: [],
    requests: { sent: [], received: [] },
    suggested: []
  });

  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    setLoading(true);
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
      Alert.alert('Error', 'Failed to load friends data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const result = await APIService.sendFriendRequest(userId);
      if (result.success) {
        Alert.alert('Success', 'Friend request sent!');
        loadFriendsData();
      } else {
        Alert.alert('Error', result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleRespondToRequest = async (requestId: string, action: 'ACCEPTED' | 'DECLINED') => {
    try {
      const result = await APIService.respondToFriendRequest(requestId, action);
      if (result.success) {
        Alert.alert('Success', `Friend request ${action.toLowerCase()}!`);
        loadFriendsData();
      } else {
        // Show the specific error message from the API (including session expiry)
        Alert.alert('Error', result.error || `Failed to ${action.toLowerCase()} friend request`);
      }
    } catch (error) {
      console.error('Error responding to friend request:', error);
      Alert.alert('Error', `Failed to ${action.toLowerCase()} friend request`);
    }
  };

  const handleCancelFriendRequest = async (userId: string, userName: string) => {
    Alert.alert(
      'Cancel Friend Request',
      `Are you sure you want to cancel your friend request to ${userName}?`,
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
                loadFriendsData(); // Refresh the list
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

  const handleUserPress = (userId: string) => {
    navigation.navigate('UserProfile', { 
      userId
    });
  };

  const tabs = [
    { 
      id: 'friends', 
      label: 'Friends', 
      icon: 'people', 
      count: friendsData.friends.length 
    },
    { 
      id: 'requests', 
      label: 'Requests', 
      icon: 'person-add', 
      count: friendsData.requests.received.length 
    },
    { 
      id: 'suggestions', 
      label: 'Suggestions', 
      icon: 'people-outline', 
      count: friendsData.suggested.length 
    },
    { 
      id: 'sent', 
      label: 'Sent', 
      icon: 'paper-plane-outline', 
      count: friendsData.requests.sent.length 
    },
  ];

  const UserCard: React.FC<{ 
    user: any; 
    type: 'friend' | 'suggestion' | 'received' | 'sent';
    requestId?: string;
  }> = ({ user, type, requestId }) => (
    <TouchableOpacity 
      style={styles.userCard} 
      onPress={() => handleUserPress(user.id)}
      activeOpacity={0.8}
    >
      <BlurView intensity={60} style={styles.userCardBlur}>
        <View style={styles.userCardContent}>
          <Image 
            source={{ 
              uri: user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=667eea&color=fff&size=100`
            }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userUsername}>@{user.username}</Text>
            {user.bio && <Text style={styles.userBio}>{user.bio}</Text>}
          </View>
          <View style={styles.userActions}>
            {type === 'friend' && (
              <TouchableOpacity style={styles.friendButton}>
                <BlurView intensity={80} style={styles.friendButtonBlur}>
                  <Ionicons name="checkmark" size={16} color={Colors.systemGreen} />
                </BlurView>
              </TouchableOpacity>
            )}
            {type === 'suggestion' && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => handleSendFriendRequest(user.id)}
              >
                <BlurView intensity={80} style={styles.addButtonBlur}>
                  <Ionicons name="person-add" size={16} color={Colors.white} />
                </BlurView>
              </TouchableOpacity>
            )}
            {type === 'received' && (
              <View style={styles.requestActions}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleRespondToRequest(requestId!, 'ACCEPTED')}
                >
                  <BlurView intensity={80} style={styles.acceptButtonBlur}>
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  </BlurView>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.declineButton}
                  onPress={() => handleRespondToRequest(requestId!, 'DECLINED')}
                >
                  <BlurView intensity={80} style={styles.declineButtonBlur}>
                    <Ionicons name="close" size={16} color={Colors.white} />
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}
            {type === 'sent' && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => handleCancelFriendRequest(user.id, user.name)}
              >
                <BlurView intensity={80} style={styles.cancelButtonBlur}>
                  <Ionicons name="close" size={16} color={Colors.white} />
                </BlurView>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      );
    }

    const data = (() => {
      switch (activeTab) {
        case 'friends': return friendsData.friends;
        case 'requests': return friendsData.requests.received;
        case 'suggestions': return friendsData.suggested;
        case 'sent': return friendsData.requests.sent;
        default: return [];
      }
    })();

    if (data.length === 0) {
      const emptyStates = {
        friends: { icon: 'people-outline', title: 'No Friends Yet', subtitle: 'Start by sending friend requests!' },
        requests: { icon: 'person-add-outline', title: 'No Friend Requests', subtitle: 'You don\'t have any pending requests.' },
        suggestions: { icon: 'people-outline', title: 'No Suggestions', subtitle: 'We\'ll suggest people you might know.' },
        sent: { icon: 'paper-plane-outline', title: 'No Sent Requests', subtitle: 'Friend requests you send will appear here.' }
      };
      
      const empty = emptyStates[activeTab as keyof typeof emptyStates];
      
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name={empty.icon as any} size={64} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyTitle}>{empty.title}</Text>
          <Text style={styles.emptySubtitle}>{empty.subtitle}</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {data.map((item: any, index: number) => {
          const user = activeTab === 'sent' ? item.receiver : (activeTab === 'requests' ? item.sender : item);
          const requestId = (activeTab === 'requests' || activeTab === 'sent') ? item.id : undefined;
          
          return (
            <UserCard 
              key={index} 
              user={user} 
              type={activeTab as any} 
              requestId={requestId}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <BlurView intensity={60} style={styles.tabsBlur}>
          <View style={styles.tabsContent}>
            {tabs.map((tabItem) => (
              <TouchableOpacity
                key={tabItem.id}
                style={[
                  styles.tab,
                  activeTab === tabItem.id && styles.activeTab
                ]}
                onPress={() => setActiveTab(tabItem.id as any)}
              >
                <Ionicons 
                  name={tabItem.icon as any} 
                  size={18} 
                  color={activeTab === tabItem.id ? Colors.primary : 'rgba(255, 255, 255, 0.6)'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === tabItem.id && styles.activeTabText
                ]}>
                  {tabItem.label}
                </Text>
                {tabItem.count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tabItem.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
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
  tabsContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  tabsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabsContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeTabText: {
    color: Colors.primary,
  },
  badge: {
    backgroundColor: Colors.systemRed,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: 4,
    right: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  contentContainer: {
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  userCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  userCardBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  userBio: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  userActions: {
    alignItems: 'center',
  },
  friendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  friendButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  addButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  acceptButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  declineButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  sentButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  sentButtonBlur: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sentButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cancelButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
});

export default FriendsScreen; 