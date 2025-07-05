import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  ImageBackground,
  Platform,
  Alert,
  Modal,
  ActionSheetIOS,
  TextInput,
  FlatList,
  Linking,
  Animated,
  Switch,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import { Event, User, RSVP } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import APIService from '../../services/api';
import EventPhotosGallery from '../../components/events/EventPhotosGallery';
import { LocationSharingComponent } from '../../components/location/LocationSharingComponent';
import { NearbyUsersComponent } from '../../components/location/NearbyUsersComponent';
import { LocationMapComponent } from '../../components/location/LocationMapComponent';
import { LiveLocationService } from '../../services/liveLocationService';
import { sharingService } from '../../services/sharingService';

const { width, height } = Dimensions.get('window');

type RouteParams = {
  eventId: string;
};

// Helper function to calculate countdown
const getCountdown = (eventDate: Date | string) => {
  const now = new Date();
  const dateObj = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  const diffTime = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} days ago`;
};

// Weather data mock
const getWeatherForEvent = (eventId: string) => {
  const weatherOptions = [
    { icon: 'sunny', temp: '76°F', condition: 'sunny' },
    { icon: 'partly-sunny', temp: '72°F', condition: 'partly-cloudy' },
    { icon: 'cloudy', temp: '68°F', condition: 'cloudy' },
    { icon: 'rainy', temp: '64°F', condition: 'rainy' },
  ];
  return weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
};

// Helper functions for new features
const openDirections = (location: string, lat?: number, lng?: number) => {
  const encodedLocation = encodeURIComponent(location);
  let url = '';
  
  if (lat && lng) {
    // Use coordinates if available
    if (Platform.OS === 'ios') {
      url = `maps://maps.apple.com/?daddr=${lat},${lng}`;
    } else {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${encodedLocation})`;
    }
  } else {
    // Use location name
    if (Platform.OS === 'ios') {
      url = `maps://maps.apple.com/?q=${encodedLocation}`;
    } else {
      url = `geo:0,0?q=${encodedLocation}`;
    }
  }
  
  Linking.openURL(url).catch(() => {
    // Fallback to Google Maps web
    const webUrl = `https://maps.google.com/maps?q=${encodedLocation}`;
    Linking.openURL(webUrl);
  });
};

const shareEvent = (event: Event) => {
  // This would integrate with native sharing
  Alert.alert('Share Event', `Share "${event.name}" with friends!`);
};

const EventDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { eventId } = route.params as RouteParams;
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuestTooltip, setShowGuestTooltip] = useState(false);
  const [userRSVP, setUserRSVP] = useState<RSVP>(RSVP.NO);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [pendingRSVP, setPendingRSVP] = useState<RSVP | null>(null);
  const [rsvpComment, setRSVPComment] = useState('');
  const [rsvpDietaryRestrictions, setRsvpDietaryRestrictions] = useState('');
  const [rsvpPlusOne, setRsvpPlusOne] = useState(false);
  const [rsvpPlusOneName, setRsvpPlusOneName] = useState('');
  const [rsvpRemindMe, setRsvpRemindMe] = useState(true);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<{
    status: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
    requestId?: string;
  } | null>(null);
  const [loadingFriendship, setLoadingFriendship] = useState(false);
  const [modalAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      const foundEvent = await APIService.getEventById(eventId);
      if (foundEvent) {
        // Type assertion since formatDate handles both string and Date types
        setEvent(foundEvent as unknown as Event);
        // Find current user's RSVP status
        const userAttendee = foundEvent.attendees?.find((a: any) => a.userId === user?.id);
        if (userAttendee) {
          // Convert API string to RSVP enum
          setUserRSVP(userAttendee.rsvp as RSVP);
        }
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = (response: RSVP) => {
    setPendingRSVP(response);
    setShowRSVPModal(true);
    
    // Animate modal entrance
    Animated.spring(modalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const confirmRSVP = async () => {
    if (pendingRSVP && event) {
      try {
        // Prepare RSVP data with additional info
        const rsvpData = {
          rsvp: pendingRSVP,
          comment: rsvpComment.trim(),
          dietaryRestrictions: rsvpDietaryRestrictions.trim(),
          plusOne: rsvpPlusOne,
          plusOneName: rsvpPlusOneName.trim(),
          remindMe: rsvpRemindMe,
        };

        const success = await APIService.rsvpToEvent(event.id, pendingRSVP, rsvpData);
        
        if (success) {
          setUserRSVP(pendingRSVP);
          
          // Show success message with additional context
          let successMessage = `You've responded "${pendingRSVP}" to this event`;
          if (rsvpComment.trim()) successMessage += ` with note: "${rsvpComment}"`;
          if (rsvpPlusOne && rsvpPlusOneName.trim()) successMessage += ` (bringing ${rsvpPlusOneName})`;
          
          Alert.alert('RSVP Updated', successMessage + '.');
          
          // Refresh event details
          await loadEventDetails();
        } else {
          Alert.alert('Error', 'Failed to update RSVP. Please try again.');
        }
      } catch (error) {
        console.error('RSVP error:', error);
        Alert.alert('Error', 'Failed to update RSVP. Please try again.');
      }
      
      // Reset modal state
      closeRSVPModal();
    }
  };

  const closeRSVPModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowRSVPModal(false);
      setPendingRSVP(null);
      setRSVPComment('');
      setRsvpDietaryRestrictions('');
      setRsvpPlusOne(false);
      setRsvpPlusOneName('');
      setRsvpRemindMe(true);
    });
  };

  const cancelRSVP = () => {
    closeRSVPModal();
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleOptionsPress = () => {
    if (Platform.OS === 'ios') {
      // Use iOS ActionSheet
      const options = isHosting 
        ? ['Edit Event', 'Delete Event', 'Share Event', 'Cancel']
        : ['Share Event', 'Report Event', 'Cancel'];
      
      const destructiveButtonIndex = isHosting ? 1 : 1; // Delete Event or Report Event
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: 'Event Options',
        },
        (buttonIndex) => {
          if (isHosting) {
            switch (buttonIndex) {
              case 0:
                handleEditEvent();
                break;
              case 1:
                handleDeleteEvent();
                break;
              case 2:
                handleShareEvent();
                break;
            }
          } else {
            switch (buttonIndex) {
              case 0:
                handleShareEvent();
                break;
              case 1:
                handleReportEvent();
                break;
            }
          }
        }
      );
    } else {
      // Use custom modal for Android
      setShowOptionsModal(true);
    }
  };

  const handleEditEvent = () => {
    if (!event) return;
    navigation.navigate('EditEvent', { eventId: event.id });
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone and will remove the event for all attendees.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await APIService.deleteEvent(event.id);
              if (success) {
                Alert.alert('Event Deleted', 'Your event has been deleted successfully.', [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Home'),
                  }
                ]);
              } else {
                Alert.alert('Error', 'Failed to delete event. Please try again.');
              }
            } catch (error) {
              console.error('Delete event error:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleShareEvent = async () => {
    if (!event) return;
    
    const shareOptions = [
      { title: 'Share Link', action: 'link' },
      { title: 'Copy Link', action: 'copy' },
      { title: 'Generate QR Code', action: 'qr' },
      { title: 'Create Invite Link', action: 'invite' },
      { title: 'Cancel', action: 'cancel' }
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: shareOptions.map(option => option.title),
          cancelButtonIndex: shareOptions.length - 1,
          title: 'Share Event',
        },
        async (buttonIndex) => {
          const selectedOption = shareOptions[buttonIndex];
          if (selectedOption?.action === 'cancel') return;

          try {
            switch (selectedOption?.action) {
              case 'link':
                await sharingService.shareToNative(event.id);
                break;
              case 'copy':
                const copiedLink = await sharingService.copyShareLink(event.id);
                Alert.alert('Success', 'Event link copied to clipboard!');
                break;
              case 'qr':
                try {
                  const qrCodeUrl = await sharingService.generateQRCode(event.id);
                  Alert.alert('QR Code', 'QR code generated successfully!', [
                    { text: 'OK' }
                  ]);
                } catch (error) {
                  Alert.alert('Error', 'Failed to generate QR code. Please try again.');
                }
                break;
              case 'invite':
                try {
                  const inviteLink = await sharingService.generateInviteLink(event.id, {
                    expiresIn: 168, // 7 days
                    maxUses: 50
                  });
                  Alert.alert('Invite Link Created', `Your invite link is ready! It expires in 7 days and can be used up to 50 times.`, [
                    { text: 'Copy Link', onPress: () => sharingService.copyShareLink(event.id) },
                    { text: 'Share', onPress: () => sharingService.shareToNative(event.id) },
                    { text: 'OK' }
                  ]);
                } catch (error) {
                  Alert.alert('Error', 'Failed to create invite link. Please try again.');
                }
                break;
            }
          } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Error', 'Failed to share event. Please try again.');
          }
        }
      );
    } else {
      // Android - show custom modal with sharing options
      Alert.alert(
        'Share Event',
        'How would you like to share this event?',
        [
          { text: 'Share Link', onPress: () => sharingService.shareToNative(event.id) },
          { text: 'Copy Link', onPress: async () => {
            try {
              await sharingService.copyShareLink(event.id);
              Alert.alert('Success', 'Event link copied to clipboard!');
            } catch (error) {
              Alert.alert('Error', 'Failed to copy link. Please try again.');
            }
          }},
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const handleReportEvent = () => {
    Alert.alert('Report Event', 'Event reporting functionality will be implemented here.');
  };

    const handleGuestAvatarPress = async (selectedUserData: User) => {
    setSelectedUser(selectedUserData);
    setShowUserProfileModal(true);
    
    // Load friendship status when viewing a user (don't load for current user)
    if (selectedUserData && selectedUserData.id !== user?.id) {
      setLoadingFriendship(true);
      try {
        const status = await APIService.getFriendshipStatus(selectedUserData.id);
        setFriendshipStatus(status);
      } catch (error) {
        console.error('Failed to load friendship status:', error);
      }
      setLoadingFriendship(false);
    }
  };

  const handleAddFriend = async () => {
    if (selectedUser && !loadingFriendship) {
      setLoadingFriendship(true);
      try {
        const success = await APIService.sendFriendRequest(selectedUser.id);
        if (success) {
          Alert.alert('Success', `Friend request sent to ${selectedUser.name}!`);
          // Update friendship status
          setFriendshipStatus({ status: 'PENDING_SENT' });
        } else {
          Alert.alert('Error', 'Failed to send friend request. Please try again.');
        }
      } catch (error) {
        console.error('Friend request error:', error);
        Alert.alert('Error', 'Failed to send friend request. Please try again.');
      }
      setLoadingFriendship(false);
    }
  };

  const handleViewProfile = () => {
    if (selectedUser) {
      setShowUserProfileModal(false);
      // Navigate to full profile screen
      navigation.navigate('Profile', { userId: selectedUser.id });
    }
  };

  const handleSendMessage = () => {
    if (selectedUser) {
      Alert.alert('Message', `This would open a chat with ${selectedUser.name}.`);
      setShowUserProfileModal(false);
    }
  };

  const getFriendButtonConfig = () => {
    if (!friendshipStatus || loadingFriendship) {
      return {
        title: loadingFriendship ? 'Loading...' : 'Add Friend',
        disabled: true,
        onPress: handleAddFriend,
        style: 'primary'
      };
    }

    switch (friendshipStatus.status) {
      case 'FRIENDS':
        return {
          title: 'Friends ✓',
          disabled: true,
          onPress: () => {},
          style: 'success'
        };
      case 'PENDING_SENT':
        return {
          title: 'Request Sent',
          disabled: true,
          onPress: () => {},
          style: 'secondary'
        };
      case 'PENDING_RECEIVED':
        return {
          title: 'Accept Request',
          disabled: false,
          onPress: async () => {
            if (friendshipStatus.requestId) {
              setLoadingFriendship(true);
              const success = await APIService.respondToFriendRequest(friendshipStatus.requestId, 'ACCEPTED');
              if (success) {
                setFriendshipStatus({ status: 'FRIENDS' });
                Alert.alert('Success', 'Friend request accepted!');
              }
              setLoadingFriendship(false);
            }
          },
          style: 'primary'
        };
      case 'NONE':
      default:
        return {
          title: 'Add Friend',
          disabled: false,
          onPress: handleAddFriend,
          style: 'primary'
        };
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  const getRSVPStats = () => {
    if (!event?.attendees) return { going: 0, maybe: 0, notGoing: 0, total: 0 };
    
    const going = event.attendees.filter(a => a.rsvp === RSVP.YES).length;
    const maybe = event.attendees.filter(a => a.rsvp === RSVP.MAYBE).length;
    const notGoing = event.attendees.filter(a => a.rsvp === RSVP.NO).length;
    
    return { going, maybe, notGoing, total: going + maybe + notGoing };
  };

  const getRSVPIcon = (rsvpType: RSVP) => {
    switch (rsvpType) {
      case RSVP.YES: return 'checkmark-circle';
      case RSVP.MAYBE: return 'help-circle';
      case RSVP.NO: return 'close-circle';
      default: return 'radio-button-off';
    }
  };

  const getRSVPColor = (rsvpType: RSVP) => {
    switch (rsvpType) {
      case RSVP.YES: return Colors.systemGreen;
      case RSVP.MAYBE: return Colors.systemYellow;
      case RSVP.NO: return Colors.systemRed;
      default: return 'rgba(255, 255, 255, 0.6)';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isHosting = event.hostId === user?.id;
  const attendingGuests = event.attendees?.filter(a => a.rsvp === RSVP.YES) || [];
  const maybeGuests = event.attendees?.filter(a => a.rsvp === RSVP.MAYBE) || [];
  const weather = getWeatherForEvent(event.id);
  const countdown = getCountdown(event.date);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Full Screen Event Background */}
      {event.headerImageUrl ? (
        <ImageBackground
          source={{ uri: event.headerImageUrl }}
          style={styles.fullScreenBackground}
          imageStyle={styles.backgroundImage}
        >
          {/* Enhanced Dark Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.fullScreenOverlay}
            locations={[0, 0.4, 0.7, 1]}
          />

          {/* Header with options only */}
          <View style={styles.header}>
            <View style={{ width: 44 }} />
            
            <TouchableOpacity style={styles.optionsButton} onPress={handleOptionsPress}>
              <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
                <Ionicons name="ellipsis-horizontal" size={24} color={Colors.white} />
              </BlurView>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Main Event Content */}
            <View style={styles.mainEventContent}>
              {/* Event Title */}
              <Text style={styles.eventTitle}>{event.name}</Text>
              
              {/* Date & Time */}
              <Text style={styles.eventDateTime}>
                {formatDate(event.date)}, {formatTime(event.time)}
              </Text>
              
              {/* Location */}
              <Text style={styles.eventLocation}>{event.location}</Text>
            </View>

            {/* Content sections... (same content repeated below for both cases) */}
            <View style={styles.rsvpSection}>
              <View style={styles.rsvpButtons}>
                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    styles.rsvpButtonGoing,
                    userRSVP === RSVP.YES && styles.rsvpButtonActive,
                  ]}
                  onPress={() => handleRSVP(RSVP.YES)}
                >
                  <BlurView intensity={80} tint="light" style={styles.rsvpButtonBlur}>
                    <View style={[styles.rsvpButtonContent, userRSVP === RSVP.YES && styles.rsvpButtonContentActive]}>
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color={userRSVP === RSVP.YES ? Colors.white : Colors.systemGreen} 
                      />
                      <Text style={[
                        styles.rsvpButtonText,
                        userRSVP === RSVP.YES && styles.rsvpButtonTextActive,
                      ]}>
                        Going
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    userRSVP === RSVP.NO && styles.rsvpButtonActiveNo,
                  ]}
                  onPress={() => handleRSVP(RSVP.NO)}
                >
                  <BlurView intensity={80} tint="dark" style={styles.rsvpButtonBlur}>
                    <View style={styles.rsvpButtonContent}>
                      <Ionicons 
                        name="close" 
                        size={20} 
                        color={userRSVP === RSVP.NO ? Colors.white : Colors.systemRed} 
                      />
                      <Text style={[
                        styles.rsvpButtonText,
                        userRSVP === RSVP.NO && styles.rsvpButtonTextActive,
                      ]}>
                        Not Going
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    userRSVP === RSVP.MAYBE && styles.rsvpButtonActiveMaybe,
                  ]}
                  onPress={() => handleRSVP(RSVP.MAYBE)}
                >
                  <BlurView intensity={80} tint="dark" style={styles.rsvpButtonBlur}>
                    <View style={styles.rsvpButtonContent}>
                      <Ionicons 
                        name="help" 
                        size={20} 
                        color={userRSVP === RSVP.MAYBE ? Colors.white : Colors.systemYellow} 
                      />
                      <Text style={[
                        styles.rsvpButtonText,
                        userRSVP === RSVP.MAYBE && styles.rsvpButtonTextActive,
                      ]}>
                        Maybe
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>

            {/* Host Information Section */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>Hosted by</Text>
                  <TouchableOpacity 
                    style={styles.eventHostInfo}
                    onPress={() => handleGuestAvatarPress(event.host)}
                  >
                    <Image 
                      source={{ uri: event.host?.image || 'https://via.placeholder.com/50' }} 
                      style={styles.eventHostAvatar} 
                    />
                    <View style={styles.eventHostDetails}>
                      <Text style={styles.eventHostName}>{event.host?.name || 'Unknown Host'}</Text>
                      <Text style={styles.eventHostBio}>Event organizer</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            {/* Weather Information */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <View style={styles.eventWeatherHeader}>
                    <Text style={styles.sectionTitle}>Weather</Text>
                    <Text style={styles.eventWeatherTime}>Event day forecast</Text>
                  </View>
                  <View style={styles.eventWeatherInfo}>
                    <View style={styles.eventWeatherIcon}>
                      <Ionicons name={weather.icon as any} size={40} color={Colors.white} />
                    </View>
                    <View style={styles.eventWeatherDetails}>
                      <Text style={styles.eventWeatherTemp}>{weather.temp}</Text>
                      <Text style={styles.eventWeatherCondition}>{weather.condition}</Text>
                    </View>
                    <View style={styles.eventWeatherExtras}>
                      <Text style={styles.eventWeatherExtra}>Perfect for the event!</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Location & Directions */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.locationInfo}>
                    <View style={styles.locationDetails}>
                      <Text style={styles.locationName}>{event.location}</Text>
                      {event.locationDetails && (
                        <Text style={styles.locationExtra}>{event.locationDetails}</Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.directionsButton}
                      onPress={() => openDirections(event.location, event.lat, event.lng)}
                    >
                      <BlurView intensity={60} tint="light" style={styles.directionsBlur}>
                        <View style={styles.directionsContent}>
                          <Ionicons name="navigate" size={20} color={Colors.primary} />
                          <Text style={styles.directionsText}>Directions</Text>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Guest List */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <View style={styles.guestHeader}>
                    <Text style={styles.sectionTitle}>
                      Guest List ({attendingGuests.length} going{maybeGuests.length > 0 ? `, ${maybeGuests.length} maybe` : ''})
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('GuestList', { eventId })}>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {attendingGuests.length > 0 ? (
                    <View style={styles.guestGrid}>
                      {attendingGuests.slice(0, 8).map((attendee) => (
                        <TouchableOpacity 
                          key={attendee.userId}
                          style={styles.guestAvatarContainer}
                          onPress={() => handleGuestAvatarPress(attendee.user)}
                        >
                          <Image 
                            source={{ uri: attendee.user?.image || 'https://via.placeholder.com/40' }} 
                            style={styles.guestAvatar} 
                          />
                          <Text style={styles.guestName} numberOfLines={1}>
                            {attendee.user?.name?.split(' ')[0] || 'Guest'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {attendingGuests.length > 8 && (
                        <TouchableOpacity 
                          style={styles.moreGuestsContainer}
                          onPress={() => navigation.navigate('GuestList', { eventId })}
                        >
                          <View style={styles.moreGuestsAvatar}>
                            <Text style={styles.moreGuestsText}>+{attendingGuests.length - 8}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noGuestsText}>No guests yet. Be the first to RSVP!</Text>
                  )}
                </View>
              </BlurView>
            </View>

            {/* Shared Album */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <View style={styles.albumHeader}>
                    <Text style={styles.sectionTitle}>Shared Album</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('EventPhotos', { eventId })}>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {event.photos && event.photos.length > 0 ? (
                    <View style={styles.photoGrid}>
                      {event.photos.slice(0, 6).map((photo, index) => (
                        <TouchableOpacity 
                          key={photo.id || index}
                          style={styles.photoContainer}
                          onPress={() => navigation.navigate('EventPhotos', { eventId, selectedPhotoIndex: index })}
                        >
                          <Image source={{ uri: photo.imageUrl }} style={styles.photoThumbnail} />
                        </TouchableOpacity>
                      ))}
                      {event.photos.length > 6 && (
                        <TouchableOpacity 
                          style={styles.morePhotosContainer}
                          onPress={() => navigation.navigate('EventPhotos', { eventId })}
                        >
                          <View style={styles.morePhotosOverlay}>
                            <Text style={styles.morePhotosText}>+{event.photos.length - 6}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noPhotosContainer}>
                      <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.noPhotosText}>No photos yet</Text>
                      <Text style={styles.noPhotosSubtext}>Share memories from this event!</Text>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </ImageBackground>
      ) : (
        <View style={[styles.fullScreenBackground, { backgroundColor: event.headerColor || Colors.primary }]}>
          {/* Enhanced Dark Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
            style={styles.fullScreenOverlay}
            locations={[0, 0.4, 0.7, 1]}
          />

          {/* Header with options only */}
          <View style={styles.header}>
            <View style={{ width: 44 }} />
            
            <TouchableOpacity style={styles.optionsButton} onPress={handleOptionsPress}>
              <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
                <Ionicons name="ellipsis-horizontal" size={24} color={Colors.white} />
              </BlurView>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Main Event Content */}
            <View style={styles.mainEventContent}>
              {/* Event Title */}
              <Text style={styles.eventTitle}>{event.name}</Text>
              
              {/* Date & Time */}
              <Text style={styles.eventDateTime}>
                {formatDate(event.date)}, {formatTime(event.time)}
              </Text>
              
              {/* Location */}
              <Text style={styles.eventLocation}>{event.location}</Text>
            </View>

            {/* RSVP Section */}
            <View style={styles.rsvpSection}>
              <View style={styles.rsvpButtons}>
                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    styles.rsvpButtonGoing,
                    userRSVP === RSVP.YES && styles.rsvpButtonActive,
                  ]}
                  onPress={() => handleRSVP(RSVP.YES)}
                >
                  <BlurView intensity={80} tint="light" style={styles.rsvpButtonBlur}>
                    <View style={[styles.rsvpButtonContent, userRSVP === RSVP.YES && styles.rsvpButtonContentActive]}>
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color={userRSVP === RSVP.YES ? Colors.white : Colors.systemGreen} 
                      />
                      <Text style={[
                        styles.rsvpButtonText,
                        userRSVP === RSVP.YES && styles.rsvpButtonTextActive,
                      ]}>
                        Going
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    userRSVP === RSVP.NO && styles.rsvpButtonActiveNo,
                  ]}
                  onPress={() => handleRSVP(RSVP.NO)}
                >
                  <BlurView intensity={80} tint="dark" style={styles.rsvpButtonBlur}>
                    <View style={styles.rsvpButtonContent}>
                      <Ionicons 
                        name="close" 
                        size={20} 
                        color={userRSVP === RSVP.NO ? Colors.white : Colors.systemRed} 
                      />
                      <Text style={[
                        styles.rsvpButtonText,
                        userRSVP === RSVP.NO && styles.rsvpButtonTextActive,
                      ]}>
                        Not Going
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.rsvpButton,
                    userRSVP === RSVP.MAYBE && styles.rsvpButtonActiveMaybe,
                  ]}
                  onPress={() => handleRSVP(RSVP.MAYBE)}
                >
                  <BlurView intensity={80} tint="dark" style={styles.rsvpButtonBlur}>
                    <View style={styles.rsvpButtonContent}>
                      <Ionicons 
                        name="help" 
                        size={20} 
                        color={userRSVP === RSVP.MAYBE ? Colors.white : Colors.systemYellow} 
                      />
                      <Text style={[
                        styles.rsvpButtonText,
                        userRSVP === RSVP.MAYBE && styles.rsvpButtonTextActive,
                      ]}>
                        Maybe
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>

            {/* Host Information Section */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>Hosted by</Text>
                  <TouchableOpacity 
                    style={styles.hostInfo}
                    onPress={() => handleGuestAvatarPress(event.host)}
                  >
                    <Image 
                      source={{ uri: event.host?.image || 'https://via.placeholder.com/50' }} 
                      style={styles.hostAvatar} 
                    />
                    <View style={styles.hostDetails}>
                      <Text style={styles.hostName}>{event.host?.name || 'Unknown Host'}</Text>
                      <Text style={styles.hostBio}>Event organizer</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            {/* Weather Information */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <View style={styles.weatherHeader}>
                    <Text style={styles.sectionTitle}>Weather</Text>
                    <Text style={styles.weatherTime}>Event day forecast</Text>
                  </View>
                  <View style={styles.weatherInfo}>
                    <View style={styles.weatherIcon}>
                      <Ionicons name={weather.icon as any} size={40} color={Colors.white} />
                    </View>
                    <View style={styles.weatherDetails}>
                      <Text style={styles.weatherTemp}>{weather.temp}</Text>
                      <Text style={styles.weatherCondition}>{weather.condition}</Text>
                    </View>
                    <View style={styles.weatherExtras}>
                      <Text style={styles.weatherExtra}>Perfect for the event!</Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Location & Directions */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.locationInfo}>
                    <View style={styles.locationDetails}>
                      <Text style={styles.locationName}>{event.location}</Text>
                      {event.locationDetails && (
                        <Text style={styles.locationExtra}>{event.locationDetails}</Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      style={styles.directionsButton}
                      onPress={() => openDirections(event.location, event.lat, event.lng)}
                    >
                      <BlurView intensity={60} tint="light" style={styles.directionsBlur}>
                        <View style={styles.directionsContent}>
                          <Ionicons name="navigate" size={20} color={Colors.primary} />
                          <Text style={styles.directionsText}>Directions</Text>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Guest List */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <View style={styles.guestHeader}>
                    <Text style={styles.sectionTitle}>
                      Guest List ({attendingGuests.length} going{maybeGuests.length > 0 ? `, ${maybeGuests.length} maybe` : ''})
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('GuestList', { eventId })}>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {attendingGuests.length > 0 ? (
                    <View style={styles.guestGrid}>
                      {attendingGuests.slice(0, 8).map((attendee) => (
                        <TouchableOpacity 
                          key={attendee.userId}
                          style={styles.guestAvatarContainer}
                          onPress={() => handleGuestAvatarPress(attendee.user)}
                        >
                          <Image 
                            source={{ uri: attendee.user?.image || 'https://via.placeholder.com/40' }} 
                            style={styles.guestAvatar} 
                          />
                          <Text style={styles.guestName} numberOfLines={1}>
                            {attendee.user?.name?.split(' ')[0] || 'Guest'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {attendingGuests.length > 8 && (
                        <TouchableOpacity 
                          style={styles.moreGuestsContainer}
                          onPress={() => navigation.navigate('GuestList', { eventId })}
                        >
                          <View style={styles.moreGuestsAvatar}>
                            <Text style={styles.moreGuestsText}>+{attendingGuests.length - 8}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noGuestsText}>No guests yet. Be the first to RSVP!</Text>
                  )}
                </View>
              </BlurView>
            </View>

            {/* Shared Album */}
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <View style={styles.albumHeader}>
                    <Text style={styles.sectionTitle}>Shared Album</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('EventPhotos', { eventId })}>
                      <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {event.photos && event.photos.length > 0 ? (
                    <View style={styles.photoGrid}>
                      {event.photos.slice(0, 6).map((photo, index) => (
                        <TouchableOpacity 
                          key={photo.id || index}
                          style={styles.photoContainer}
                          onPress={() => navigation.navigate('EventPhotos', { eventId, selectedPhotoIndex: index })}
                        >
                          <Image source={{ uri: photo.imageUrl }} style={styles.photoThumbnail} />
                        </TouchableOpacity>
                      ))}
                      {event.photos.length > 6 && (
                        <TouchableOpacity 
                          style={styles.morePhotosContainer}
                          onPress={() => navigation.navigate('EventPhotos', { eventId })}
                        >
                          <View style={styles.morePhotosOverlay}>
                            <Text style={styles.morePhotosText}>+{event.photos.length - 6}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noPhotosContainer}>
                      <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.noPhotosText}>No photos yet</Text>
                      <Text style={styles.noPhotosSubtext}>Share memories from this event!</Text>
                    </View>
                  )}
                </View>
              </BlurView>
            </View>

            {/* Bottom spacing */}
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </View>
      )}

      {/* User Profile Modal */}
      <Modal
        visible={showUserProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserProfileModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowUserProfileModal(false)}
        >
          <View style={styles.userProfileModalContainer}>
            <BlurView intensity={100} tint="dark" style={styles.userProfileModalBlur}>
              <View style={styles.userProfileModalContent}>
                {selectedUser && (
                  <>
                    <View style={styles.userProfileHeader}>
                      <Image
                        source={{ uri: selectedUser.image }}
                        style={styles.userProfileAvatar}
                      />
                      <Text style={styles.userProfileName}>{selectedUser.name}</Text>
                      <Text style={styles.userProfileBio}>{selectedUser.bio}</Text>
                      <Text style={styles.userProfileLocation}>{selectedUser.location}</Text>
                    </View>
                    
                    <View style={styles.userProfileInterests}>
                      <Text style={styles.userProfileInterestsTitle}>Interests</Text>
                      <View style={styles.interestTags}>
                        {selectedUser.interests?.map((interest, index) => (
                          <View key={index} style={styles.interestTag}>
                            <Text style={styles.interestTagText}>{interest}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    
                    <View style={styles.userProfileActions}>
                      {selectedUser?.id !== user?.id && (
                        <TouchableOpacity
                          style={[
                            styles.userProfileActionButton, 
                            getFriendButtonConfig().style === 'primary' ? styles.userProfileActionButtonPrimary :
                            getFriendButtonConfig().style === 'success' ? styles.userProfileActionButtonSuccess :
                            styles.userProfileActionButtonSecondary
                          ]}
                          onPress={getFriendButtonConfig().onPress}
                          disabled={getFriendButtonConfig().disabled}
                        >
                          <Ionicons 
                            name={
                              getFriendButtonConfig().style === 'success' ? "checkmark-circle" :
                              getFriendButtonConfig().title === 'Request Sent' ? "time" :
                              "person-add"
                            } 
                            size={20} 
                            color={Colors.white} 
                          />
                          <Text style={styles.userProfileActionText}>{getFriendButtonConfig().title}</Text>
                        </TouchableOpacity>
                      )}
                      

                    </View>
                    
                    <TouchableOpacity
                      style={[styles.userProfileActionButton, styles.userProfileActionButtonOutline]}
                      onPress={handleViewProfile}
                    >
                      <Ionicons name="person-circle" size={20} color={Colors.primary} />
                      <Text style={[styles.userProfileActionText, { color: Colors.primary }]}>View Full Profile</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Enhanced RSVP Modal */}
      <Modal
        visible={showRSVPModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRSVP}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={cancelRSVP}
        >
          <View style={styles.enhancedRsvpModalContainer}>
            <BlurView intensity={100} tint="dark" style={styles.rsvpModalBlur}>
              <View style={styles.enhancedRsvpModalContent}>
                {/* RSVP Header with Icon */}
                <View style={styles.rsvpModalHeader}>
                  <View style={[styles.rsvpModalIcon, { backgroundColor: getRSVPColor(pendingRSVP || RSVP.YES) }]}>
                    <Ionicons 
                      name={getRSVPIcon(pendingRSVP || RSVP.YES) as any} 
                      size={32} 
                      color={Colors.white} 
                    />
                  </View>
                  <Text style={styles.rsvpModalTitle}>
                    {pendingRSVP === RSVP.YES ? 'Going to Event' : 
                     pendingRSVP === RSVP.MAYBE ? 'Maybe Going' : 'Not Going'}
                  </Text>
                  <Text style={styles.rsvpModalSubtitle}>
                    {pendingRSVP === RSVP.YES ? 'Great! We\'re excited to see you there!' : 
                     pendingRSVP === RSVP.MAYBE ? 'Let us know when you decide!' : 
                     'Thanks for letting us know.'}
                  </Text>
                </View>

                {/* RSVP Stats */}
                <View style={styles.rsvpStatsContainer}>
                  <Text style={styles.rsvpStatsTitle}>Current RSVPs</Text>
                  <View style={styles.rsvpStatsRow}>
                    <View style={styles.rsvpStat}>
                      <Text style={[styles.rsvpStatNumber, { color: Colors.systemGreen }]}>
                        {getRSVPStats().going}
                      </Text>
                      <Text style={styles.rsvpStatLabel}>Going</Text>
                    </View>
                    <View style={styles.rsvpStat}>
                      <Text style={[styles.rsvpStatNumber, { color: Colors.systemYellow }]}>
                        {getRSVPStats().maybe}
                      </Text>
                      <Text style={styles.rsvpStatLabel}>Maybe</Text>
                    </View>
                    <View style={styles.rsvpStat}>
                      <Text style={[styles.rsvpStatNumber, { color: Colors.systemRed }]}>
                        {getRSVPStats().notGoing}
                      </Text>
                      <Text style={styles.rsvpStatLabel}>Not Going</Text>
                    </View>
                  </View>
                </View>

                {/* Comment Section */}
                <View style={styles.rsvpSection}>
                  <Text style={styles.rsvpSectionTitle}>Add a comment (optional)</Text>
                  <View style={styles.rsvpCommentContainer}>
                    <BlurView intensity={80} tint="dark" style={styles.rsvpCommentBlur}>
                      <TextInput
                        style={styles.rsvpCommentInput}
                        value={rsvpComment}
                        onChangeText={setRSVPComment}
                        placeholder={pendingRSVP === RSVP.YES ? "Can't wait to be there!" : 
                                   pendingRSVP === RSVP.MAYBE ? "Will try to make it..." : 
                                   "Sorry, can't make it"}
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        multiline
                        numberOfLines={3}
                        maxLength={200}
                      />
                    </BlurView>
                  </View>
                </View>

                {/* Additional Options for Going/Maybe */}
                {(pendingRSVP === RSVP.YES || pendingRSVP === RSVP.MAYBE) && (
                  <>
                    {/* Dietary Restrictions */}
                    <View style={styles.rsvpSection}>
                      <Text style={styles.rsvpSectionTitle}>Dietary restrictions (optional)</Text>
                      <View style={styles.rsvpCommentContainer}>
                        <BlurView intensity={80} tint="dark" style={styles.rsvpCommentBlur}>
                          <TextInput
                            style={[styles.rsvpCommentInput, { minHeight: 50 }]}
                            value={rsvpDietaryRestrictions}
                            onChangeText={setRsvpDietaryRestrictions}
                            placeholder="Vegetarian, allergies, etc."
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            maxLength={100}
                          />
                        </BlurView>
                      </View>
                    </View>

                    {/* Plus One Option */}
                    <View style={styles.rsvpSection}>
                      <View style={styles.rsvpOptionRow}>
                        <Text style={styles.rsvpSectionTitle}>Bringing someone?</Text>
                        <Switch
                          value={rsvpPlusOne}
                          onValueChange={setRsvpPlusOne}
                          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: Colors.primary }}
                          thumbColor={rsvpPlusOne ? Colors.white : 'rgba(255, 255, 255, 0.8)'}
                        />
                      </View>
                      {rsvpPlusOne && (
                        <View style={styles.rsvpCommentContainer}>
                          <BlurView intensity={80} tint="dark" style={styles.rsvpCommentBlur}>
                            <TextInput
                              style={[styles.rsvpCommentInput, { minHeight: 50 }]}
                              value={rsvpPlusOneName}
                              onChangeText={setRsvpPlusOneName}
                              placeholder="Guest's name"
                              placeholderTextColor="rgba(255, 255, 255, 0.5)"
                              maxLength={50}
                            />
                          </BlurView>
                        </View>
                      )}
                    </View>

                    {/* Reminder Option */}
                    <View style={styles.rsvpSection}>
                      <View style={styles.rsvpOptionRow}>
                        <Text style={styles.rsvpSectionTitle}>Remind me before event</Text>
                        <Switch
                          value={rsvpRemindMe}
                          onValueChange={setRsvpRemindMe}
                          trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: Colors.primary }}
                          thumbColor={rsvpRemindMe ? Colors.white : 'rgba(255, 255, 255, 0.8)'}
                        />
                      </View>
                    </View>
                  </>
                )}
                
                {/* Action Buttons */}
                <View style={styles.rsvpModalButtons}>
                  <TouchableOpacity
                    style={[styles.rsvpModalButton, styles.rsvpModalButtonSecondary]}
                    onPress={cancelRSVP}
                  >
                    <Text style={styles.rsvpModalButtonTextSecondary}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.rsvpModalButton, styles.rsvpModalButtonPrimary]}
                    onPress={confirmRSVP}
                  >
                    <Text style={styles.rsvpModalButtonText}>Confirm RSVP</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Android Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModalContainer}>
            <BlurView intensity={100} tint="dark" style={styles.optionsModalBlur}>
              <View style={styles.optionsModalContent}>
                <Text style={styles.optionsModalTitle}>Event Options</Text>
                
                {isHosting ? (
                  <>
                    <TouchableOpacity
                      style={styles.optionsModalButton}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleEditEvent();
                      }}
                    >
                      <Ionicons name="create-outline" size={20} color={Colors.white} />
                      <Text style={styles.optionsModalButtonText}>Edit Event</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.optionsModalButton, styles.optionsModalButtonDestructive]}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleDeleteEvent();
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.systemRed} />
                      <Text style={[styles.optionsModalButtonText, { color: Colors.systemRed }]}>Delete Event</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.optionsModalButton}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleShareEvent();
                      }}
                    >
                      <Ionicons name="share-outline" size={20} color={Colors.white} />
                      <Text style={styles.optionsModalButtonText}>Share Event</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.optionsModalButton}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleShareEvent();
                      }}
                    >
                      <Ionicons name="share-outline" size={20} color={Colors.white} />
                      <Text style={styles.optionsModalButtonText}>Share Event</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.optionsModalButton, styles.optionsModalButtonDestructive]}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleReportEvent();
                      }}
                    >
                      <Ionicons name="flag-outline" size={20} color={Colors.systemRed} />
                      <Text style={[styles.optionsModalButtonText, { color: Colors.systemRed }]}>Report Event</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                <TouchableOpacity
                  style={[styles.optionsModalButton, styles.optionsModalButtonCancel]}
                  onPress={() => setShowOptionsModal(false)}
                >
                  <Text style={styles.optionsModalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
                 </TouchableOpacity>
       </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fullScreenBackground: {
    flex: 1,
    width,
    height,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: Spacing.lg,
    zIndex: 2,
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  optionsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingTop: height * 0.4, // Start content below the fold
    paddingBottom: 100, // Bottom navigation spacing
  },
  mainEventContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventDateTime: {
    fontSize: 18,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventLocation: {
    fontSize: 16,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rsvpSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rsvpButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  rsvpButtonGoing: {
    // Special styling for going button
  },
  rsvpButtonBlur: {
    flex: 1,
    borderRadius: 25,
  },
  rsvpButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: Spacing.xs,
  },
  rsvpButtonContentActive: {
    backgroundColor: Colors.systemGreen,
    borderColor: Colors.systemGreen,
  },
  rsvpButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  rsvpButtonTextActive: {
    color: Colors.white,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.systemGreen,
  },
  rsvpButtonActiveMaybe: {
    backgroundColor: Colors.systemYellow,
  },
  rsvpButtonActiveNo: {
    backgroundColor: Colors.systemRed,
  },
  glassCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  glassCardBlur: {
    borderRadius: 20,
  },
  glassCardContent: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassCardTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  glassCardSubtitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.md,
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  guestListButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  guestListButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  guestListButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: Spacing.xs,
  },
  guestListButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  attendeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  attendeeGridItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  attendeeGridAvatar: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 22,
  },
  attendeeMoreItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  attendeeMoreText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  attendeeComment: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  attendeeCommentAuthor: {
    fontWeight: FontWeight.semibold,
    fontStyle: 'normal',
  },
  noAttendeesContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noAttendeesText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  rsvpStatsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  rsvpStat: {
    alignItems: 'center',
  },
  rsvpStatNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  rsvpStatLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: FontWeight.medium,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  weatherCondition: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  weatherDetails: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.xs,
  },
  weatherSource: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  locationAddress: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  mapContainer: {
    height: 120,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  mockMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPin: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -10 }, { translateY: -10 }],
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.systemRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLabel: {
    position: 'absolute',
    bottom: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  hostInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  eventDescription: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  photoGridItem: {
    width: (width - Spacing.lg * 2 - Spacing.lg * 2 - Spacing.xs * 2) / 3,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.text,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContainer: {
    margin: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  optionsModalBlur: {
    borderRadius: 20,
  },
  optionsModalContent: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionsModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  optionsModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  optionsModalButtonDestructive: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  optionsModalButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: Spacing.md,
    justifyContent: 'center',
  },
  optionsModalButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },
  rsvpModalContainer: {
    margin: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  rsvpModalBlur: {
    borderRadius: 20,
  },
  rsvpModalContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rsvpModalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  rsvpModalSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  rsvpCommentContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  rsvpCommentBlur: {
    borderRadius: BorderRadius.lg,
  },
  rsvpCommentInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rsvpModalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rsvpModalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  rsvpModalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  rsvpModalButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rsvpModalButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  rsvpModalButtonTextSecondary: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userProfileModalContainer: {
    margin: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  userProfileModalBlur: {
    borderRadius: 20,
  },
  userProfileModalContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userProfileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  userProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.white,
    marginBottom: Spacing.md,
  },
  userProfileName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  userProfileBio: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  userProfileLocation: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  userProfileInterests: {
    marginBottom: Spacing.lg,
  },
  userProfileInterestsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  interestTagText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: FontWeight.medium,
  },
  userProfileActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  userProfileActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  userProfileActionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  userProfileActionButtonSecondary: {
    backgroundColor: Colors.systemGreen,
  },
  userProfileActionButtonSuccess: {
    backgroundColor: Colors.systemGreen,
  },
  userProfileActionButtonOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  userProfileActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  // New styles for added sections
  sectionContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
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
  // Host section styles
  eventHostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  eventHostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  eventHostDetails: {
    flex: 1,
  },
  eventHostName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs / 2,
  },
  eventHostBio: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Weather section styles
  eventWeatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  eventWeatherTime: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  eventWeatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  eventWeatherIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventWeatherDetails: {
    flex: 1,
  },
  eventWeatherTemp: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs / 2,
  },
  eventWeatherCondition: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'capitalize',
  },
  eventWeatherExtras: {
    alignItems: 'flex-end',
  },
  eventWeatherExtra: {
    fontSize: FontSize.sm,
    color: Colors.systemGreen,
    fontWeight: FontWeight.medium,
  },
  // Location section styles
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.white,
    marginBottom: Spacing.xs / 2,
  },
  locationExtra: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  directionsButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  directionsBlur: {
    borderRadius: BorderRadius.lg,
  },
  directionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: Spacing.xs,
  },
  directionsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  // Guest list styles
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  guestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  guestAvatarContainer: {
    alignItems: 'center',
    width: (width - Spacing.lg * 4 - Spacing.sm * 7) / 8,
  },
  guestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.white,
    marginBottom: Spacing.xs / 2,
  },
  guestName: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  moreGuestsContainer: {
    alignItems: 'center',
    width: (width - Spacing.lg * 4 - Spacing.sm * 7) / 8,
  },
  moreGuestsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
  },
  moreGuestsText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  noGuestsText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Photo album styles
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  photoContainer: {
    width: (width - Spacing.lg * 4 - Spacing.xs * 2) / 3,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  morePhotosContainer: {
    width: (width - Spacing.lg * 4 - Spacing.xs * 2) / 3,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  noPhotosContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noPhotosText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.sm,
  },
  noPhotosSubtext: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Spacing.xs,
  },
  rsvpSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  rsvpOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rsvpStatsContainer: {
    marginBottom: Spacing.lg,
  },
  rsvpStatsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  rsvpModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  rsvpModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  enhancedRsvpModalContainer: {
    margin: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
    maxHeight: height * 0.85,
  },
  enhancedRsvpModalContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxHeight: height * 0.85,
  },
  rsvpStatsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rsvpStatsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  rsvpSection: {
    marginBottom: Spacing.lg,
  },
  rsvpSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.sm,
  },
  rsvpOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
});

export default EventDetailsScreen; 