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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import { Event, User, RSVP } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import APIService from '../../services/api';

const { width, height } = Dimensions.get('window');

type RouteParams = {
  eventId: string;
};

const GuestListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { eventId } = route.params as RouteParams;
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showGuestOptionsModal, setShowGuestOptionsModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      const foundEvent = await APIService.getEventById(eventId);
      if (foundEvent) {
        setEvent(foundEvent as unknown as Event);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleGuestAvatarPress = (user: User) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };

  const handleGuestOptionsPress = (guest: any) => {
    setSelectedGuest(guest);
    setShowGuestOptionsModal(true);
  };

  const handleViewProfile = () => {
    if (selectedUser) {
      setShowUserProfileModal(false);
      navigation.navigate('Profile', { userId: selectedUser.id });
    }
  };

  const handleSendMessage = () => {
    if (selectedUser) {
      Alert.alert('Message', `This would open a chat with ${selectedUser.name}.`);
      setShowUserProfileModal(false);
    }
  };

  const handleRemoveGuest = () => {
    if (selectedGuest && event) {
      Alert.alert(
        'Remove Guest',
        `Are you sure you want to remove ${selectedGuest.user.name} from this event?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                const success = await APIService.removeAttendee(event.id, selectedGuest.userId);
                if (success) {
                  Alert.alert('Success', 'Guest removed successfully');
                  await loadEventDetails(); // Refresh the list
                } else {
                  Alert.alert('Error', 'Failed to remove guest');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to remove guest');
              }
              setShowGuestOptionsModal(false);
            },
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading guest list...</Text>
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
                     <TouchableOpacity style={styles.errorBackButton} onPress={handleBackPress}>
             <Text style={styles.backButtonText}>Go Back</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isHosting = event.hostId === user?.id;
  const attendingGuests = event.attendees?.filter(a => a.rsvp === RSVP.YES) || [];
  const maybeGuests = event.attendees?.filter(a => a.rsvp === RSVP.MAYBE) || [];
  const allGuests = [...attendingGuests, ...maybeGuests];

  // Create a circular arrangement for the avatar grid
  const getAvatarGridPositions = (count: number) => {
    const positions = [];
    const centerX = width / 2;
    const centerY = 200;
    const radius = Math.min(80, count > 8 ? 60 : 80);
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const angle = (i / Math.min(count, 10)) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 25; // -25 for half avatar width
      const y = centerY + radius * Math.sin(angle) - 25; // -25 for half avatar height
      positions.push({ x, y });
    }
    
    return positions;
  };

  const avatarPositions = getAvatarGridPositions(allGuests.length);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background with glassmorphism effect */}
      <ImageBackground
        source={{ uri: event.headerImageUrl || undefined }}
        style={styles.fullScreenBackground}
        imageStyle={styles.backgroundImage}
      >
        {event.headerImageUrl ? null : (
          <View style={[styles.colorBackground, { backgroundColor: event.headerColor || Colors.primary }]} />
        )}
        
        {/* Dark overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.fullScreenOverlay}
          locations={[0, 0.3, 0.6, 1]}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </BlurView>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Guest List</Text>
          
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Circular Avatar Grid */}
          <View style={styles.avatarGridContainer}>
            {allGuests.slice(0, 10).map((guest, index) => {
              const position = avatarPositions[index];
              return (
                <TouchableOpacity
                  key={guest.userId}
                  style={[
                    styles.avatarGridItem,
                    {
                      position: 'absolute',
                      left: position.x,
                      top: position.y,
                    },
                  ]}
                  onPress={() => handleGuestAvatarPress(guest.user)}
                >
                  <Image 
                    source={{ uri: guest.user?.image || 'https://via.placeholder.com/50' }} 
                    style={styles.avatarGridImage} 
                  />
                  {guest.rsvp === RSVP.YES && (
                    <View style={styles.confirmBadge}>
                      <Ionicons name="checkmark" size={12} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Host Section */}
          <View style={styles.sectionContainer}>
            <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>HOST</Text>
                <TouchableOpacity 
                  style={styles.hostCard}
                  onPress={() => handleGuestAvatarPress(event.host)}
                >
                  <Image 
                    source={{ uri: event.host?.image || 'https://via.placeholder.com/50' }} 
                    style={styles.hostAvatar} 
                  />
                  <Text style={styles.hostName}>{event.host?.name || 'Unknown Host'}</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Going Section */}
          {attendingGuests.length > 0 && (
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>GOING ({attendingGuests.length})</Text>
                  
                                     {attendingGuests.map((guest, index) => (
                     <View key={guest.userId} style={styles.guestCard}>
                       <TouchableOpacity 
                         style={styles.guestInfo}
                         onPress={() => handleGuestAvatarPress(guest.user)}
                       >
                         <Image 
                           source={{ uri: guest.user?.image || 'https://via.placeholder.com/50' }} 
                           style={styles.guestAvatar} 
                         />
                         <View style={styles.guestDetails}>
                           <Text style={styles.guestName}>{guest.user?.name || 'Guest'}</Text>
                           <Text style={styles.guestStatus}>Going to this event</Text>
                         </View>
                       </TouchableOpacity>
                      
                      {isHosting && guest.userId !== user?.id && (
                        <TouchableOpacity 
                          style={styles.guestOptionsButton}
                          onPress={() => handleGuestOptionsPress(guest)}
                        >
                          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </BlurView>
            </View>
          )}

          {/* Maybe Section */}
          {maybeGuests.length > 0 && (
            <View style={styles.sectionContainer}>
              <BlurView intensity={80} tint="dark" style={styles.sectionBlur}>
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionTitle}>MAYBE ({maybeGuests.length})</Text>
                  
                                     {maybeGuests.map((guest, index) => (
                     <View key={guest.userId} style={styles.guestCard}>
                       <TouchableOpacity 
                         style={styles.guestInfo}
                         onPress={() => handleGuestAvatarPress(guest.user)}
                       >
                         <Image 
                           source={{ uri: guest.user?.image || 'https://via.placeholder.com/50' }} 
                           style={styles.guestAvatar} 
                         />
                         <View style={styles.guestDetails}>
                           <Text style={styles.guestName}>{guest.user?.name || 'Guest'}</Text>
                           <Text style={styles.guestStatus}>Might join this event</Text>
                         </View>
                       </TouchableOpacity>
                      
                      {isHosting && guest.userId !== user?.id && (
                        <TouchableOpacity 
                          style={styles.guestOptionsButton}
                          onPress={() => handleGuestOptionsPress(guest)}
                        >
                          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </BlurView>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </ImageBackground>

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
                        source={{ uri: selectedUser.image || 'https://via.placeholder.com/80' }}
                        style={styles.userProfileAvatar}
                      />
                      <Text style={styles.userProfileName}>{selectedUser.name}</Text>
                      <Text style={styles.userProfileBio}>{selectedUser.bio || 'No bio available'}</Text>
                    </View>
                    
                    <View style={styles.userProfileActions}>
                      <TouchableOpacity
                        style={[styles.userProfileActionButton, styles.userProfileActionButtonPrimary]}
                        onPress={handleViewProfile}
                      >
                        <Ionicons name="person-circle" size={20} color={Colors.white} />
                        <Text style={styles.userProfileActionText}>View Profile</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.userProfileActionButton, styles.userProfileActionButtonSecondary]}
                        onPress={handleSendMessage}
                      >
                        <Ionicons name="chatbubble" size={20} color={Colors.white} />
                        <Text style={styles.userProfileActionText}>Message</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Guest Options Modal */}
      <Modal
        visible={showGuestOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGuestOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowGuestOptionsModal(false)}
        >
          <View style={styles.optionsModalContainer}>
            <BlurView intensity={100} tint="dark" style={styles.optionsModalBlur}>
              <View style={styles.optionsModalContent}>
                <Text style={styles.optionsModalTitle}>Guest Options</Text>
                
                <TouchableOpacity
                  style={styles.optionsModalButton}
                  onPress={() => {
                    setShowGuestOptionsModal(false);
                    if (selectedGuest) handleGuestAvatarPress(selectedGuest.user);
                  }}
                >
                  <Ionicons name="person-circle" size={20} color={Colors.white} />
                  <Text style={styles.optionsModalButtonText}>View Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.optionsModalButton, styles.optionsModalButtonDestructive]}
                  onPress={handleRemoveGuest}
                >
                  <Ionicons name="person-remove" size={20} color={Colors.systemRed} />
                  <Text style={[styles.optionsModalButtonText, { color: Colors.systemRed }]}>Remove from Event</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.optionsModalButton, styles.optionsModalButtonCancel]}
                  onPress={() => setShowGuestOptionsModal(false)}
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
  colorBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContent: {
    paddingTop: 50,
    paddingBottom: 100,
  },
  avatarGridContainer: {
    height: 300,
    marginHorizontal: Spacing.lg,
    position: 'relative',
  },
  avatarGridItem: {
    width: 50,
    height: 50,
  },
  avatarGridImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  confirmBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.systemGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
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
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.white,
    marginRight: Spacing.md,
  },
  hostName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.white,
    marginRight: Spacing.md,
  },
  guestDetails: {
    flex: 1,
  },
  guestName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs / 2,
  },
  guestComment: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  guestOptionsButton: {
    padding: Spacing.sm,
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
    color: Colors.white,
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
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  userProfileActions: {
    flexDirection: 'row',
    gap: Spacing.md,
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
  userProfileActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
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
   errorBackButton: {
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
   guestStatus: {
     fontSize: FontSize.sm,
     color: 'rgba(255, 255, 255, 0.8)',
     fontStyle: 'italic',
   },
});

export default GuestListScreen; 