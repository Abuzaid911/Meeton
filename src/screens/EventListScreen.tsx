import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../constants';
import { Event, User, RSVP } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useRSVP } from '../contexts/RSVPContext';
import APIService from '../services/api';

const { width, height } = Dimensions.get('window');

// Weather data mock (in real app, fetch from weather API)
const getWeatherForEvent = (eventId: string) => {
  const weatherOptions = [
    { icon: 'sunny', temp: '36°C', condition: 'sunny' },
    { icon: 'sunny', temp: '31°C', condition: 'sunny' },
    { icon: 'sunny', temp: '34°C', condition: 'sunny' },
    { icon: 'sunny', temp: '30°C', condition: 'sunny' },
  ];
  return weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
};

const EventListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, signOut } = useAuth();
  const { userRSVP } = useRSVP();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get filter parameters from navigation
  const filter = route.params?.filter;
  const screenTitle = route.params?.title || 'Events';

  // Simple animation values using basic Animated
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadEvents();
    // Animate cards in on load
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [filter]);

  // Reload events when screen comes into focus (e.g. after creating a new event)
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [filter])
  );

  const loadEvents = async () => {
    try {
      let fetchedEvents = await APIService.getEvents();
      
      // Filter events based on the filter parameter
      if (filter && fetchedEvents && user) {
        switch (filter) {
          case 'hosted':
            fetchedEvents = fetchedEvents.filter(event => event.hostId === user.id);
            break;
          case 'attending':
            fetchedEvents = fetchedEvents.filter(event => 
              event.attendees?.some(attendee => 
                attendee.user.id === user.id && attendee.rsvp === RSVP.YES
              )
            );
            break;
          case 'my-events':
            fetchedEvents = fetchedEvents.filter(event => 
              event.hostId === user.id || 
              event.attendees?.some(attendee => 
                attendee.user.id === user.id && attendee.rsvp === RSVP.YES
              )
            );
            break;
          default:
            // No filter, show all events
            break;
        }
      }
      
      // Type assertion since formatDate handles both string and Date types
      setEvents((fetchedEvents || []) as unknown as Event[]);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const handleCreateEvent = () => {
    // Navigate to the Create tab instead of a specific screen
    navigation.navigate('Create');
  };

  const handleProfilePress = () => {
    setShowProfileModal(true);
  };

  const handleSettingsPress = () => {
    setShowProfileModal(false);
    // Navigate to profile settings
    navigation.navigate('Profile');
  };

  const handleLogoutPress = async () => {
    setShowProfileModal(false);
    try {
      await signOut();
      // Navigation to login screen will be handled automatically by the AuthNavigator
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const EventCard: React.FC<{ event: Event; index: number }> = ({ event, index }) => {
    const attendeeCount = event.attendees?.filter(a => a.rsvp === RSVP.YES).length || 0;
    const isHosting = event.hostId === user?.id;
    const weather = getWeatherForEvent(event.id);
    // Only show confirmed attendees (going + maybe), never "not going" users
    const confirmedAttendees = event.attendees?.filter(a => a.rsvp === RSVP.YES || a.rsvp === RSVP.MAYBE) || [];

    return (
      <View style={styles.fullScreenCard}>
        <TouchableOpacity
          style={styles.eventCard}
          onPress={() => handleEventPress(event.id)}
          activeOpacity={0.95}
        >
          {event.headerImageUrl ? (
            <ImageBackground
              source={{ uri: event.headerImageUrl }}
              style={styles.cardBackground}
              imageStyle={styles.cardBackgroundImage}
            >
              {/* Enhanced Glassmorphism Overlay */}
              <BlurView intensity={15} style={styles.cardBlur}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.cardGlassLayer}
                >
                  {/* Weather Widget */}
                  <View style={styles.weatherWidget}>
                    <BlurView intensity={60} style={styles.weatherBlur}>
                      <View style={styles.weatherContent}>
                        <Ionicons name={weather.icon as any} size={16} color={Colors.white} />
                        <Text style={styles.weatherText}>{weather.temp}</Text>
                      </View>
                    </BlurView>
                  </View>

                  {/* Enhanced Hosting Badge */}
                  {isHosting && (
                    <View style={styles.hostingBadge}>
                      <BlurView intensity={60} style={styles.hostingBadgeBlur}>
                        <View style={styles.hostingBadgeGradient}>
                          <Ionicons name="star" size={12} color={Colors.white} />
                          <Text style={styles.hostingText}>Hosting</Text>
                        </View>
                      </BlurView>
                    </View>
                  )}

                  {/* Enhanced Text Readability with Dark Gradient */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                    style={styles.textReadabilityGradient}
                  >
                    <View style={styles.cardContent}>
                      {/* Glass Text Container */}
                      <BlurView intensity={40} style={styles.textContainer}>
                        <View style={styles.textContainerInner}>
                          <Text style={styles.eventTitle}>{event.name}</Text>
                          <Text style={styles.eventDate}>
                            {formatDate(event.date)} • {event.time}
                          </Text>
                          <Text style={styles.eventLocation}>{event.location}</Text>
                        </View>
                      </BlurView>

                      {/* Enhanced Attendee Avatars */}
                      {confirmedAttendees.length > 0 && (
                        <View style={styles.attendeeRow}>
                          <View style={styles.attendeeAvatars}>
                            {confirmedAttendees.slice(0, 4).map((attendee, avatarIndex) => (
                              <View
                                key={attendee.id}
                                style={[
                                  styles.attendeeAvatar,
                                  {
                                    marginLeft: avatarIndex > 0 ? -8 : 0,
                                    zIndex: 4 - avatarIndex,
                                  }
                                ]}
                              >
                                <Image
                                  source={{ uri: attendee.user.image }}
                                  style={styles.avatarImage}
                                />
                                <View style={styles.avatarGlow} />
                              </View>
                            ))}
                            {confirmedAttendees.length > 4 && (
                              <View style={[styles.attendeeAvatar, styles.moreAttendees]}>
                                <Text style={styles.moreAttendeesText}>+{confirmedAttendees.length - 4}</Text>
                              </View>
                            )}
                          </View>
                           <View style={styles.attendeeCountBadge}>
                             <Ionicons name="people" size={14} color={Colors.white} />
                             <Text style={styles.attendeeCountText}>
                               {attendeeCount} Going
                             </Text>
                           </View>
                        </View>
                      
                      )}
                    </View>
                  </LinearGradient>
                </LinearGradient>
              </BlurView>
            </ImageBackground>
          ) : (
            <View style={[styles.cardBackground, { backgroundColor: event.headerColor || Colors.primary }]}>
              {/* Enhanced Glassmorphism Overlay */}
              <BlurView intensity={15} style={styles.cardBlur}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.cardGlassLayer}
                >
                  {/* Weather Widget */}
                  <View style={styles.weatherWidget}>
                    <BlurView intensity={60} style={styles.weatherBlur}>
                      <View style={styles.weatherContent}>
                        <Ionicons name={weather.icon as any} size={16} color={Colors.white} />
                        <Text style={styles.weatherText}>{weather.temp}</Text>
                      </View>
                    </BlurView>
                  </View>

                  {/* Enhanced Hosting Badge */}
                  {isHosting && (
                    <View style={styles.hostingBadge}>
                      <BlurView intensity={60} style={styles.hostingBadgeBlur}>
                        <View style={styles.hostingBadgeGradient}>
                          <Ionicons name="star" size={12} color={Colors.white} />
                          <Text style={styles.hostingText}>Hosting</Text>
                        </View>
                      </BlurView>
                    </View>
                  )}

                  {/* Enhanced Text Readability with Dark Gradient */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                    style={styles.textReadabilityGradient}
                  >
                    <View style={styles.cardContent}>
                      {/* Glass Text Container */}
                      <BlurView intensity={40} style={styles.textContainer}>
                        <View style={styles.textContainerInner}>
                          <Text style={styles.eventTitle}>{event.name}</Text>
                          <Text style={styles.eventDate}>
                            {formatDate(event.date)} • {event.time}
                          </Text>
                          <Text style={styles.eventLocation}>{event.location}</Text>
                        </View>
                      </BlurView>

                      {/* Enhanced Attendee Avatars */}
                      {confirmedAttendees.length > 0 && (
                        <View style={styles.attendeeRow}>
                          <View style={styles.attendeeAvatars}>
                            {confirmedAttendees.slice(0, 4).map((attendee, avatarIndex) => (
                              <View
                                key={attendee.id}
                                style={[
                                  styles.attendeeAvatar,
                                  {
                                    marginLeft: avatarIndex > 0 ? -8 : 0,
                                    zIndex: 4 - avatarIndex,
                                  }
                                ]}
                              >
                                <Image
                                  source={{ uri: attendee.user.image }}
                                  style={styles.avatarImage}
                                />
                                <View style={styles.avatarGlow} />
                              </View>
                            ))}
                            {confirmedAttendees.length > 4 && (
                              <View style={[styles.attendeeAvatar, styles.moreAttendees]}>
                                <Text style={styles.moreAttendeesText}>+{confirmedAttendees.length - 4}</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.attendeeCountBadge}>
                            <Ionicons name="people" size={14} color={Colors.white} />
                            <Text style={styles.attendeeCountText}>
                              {attendeeCount} Going
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </LinearGradient>
              </BlurView>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.fullScreenCard}>
      <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyTitle}>No Events</Text>
        <Text style={styles.emptySubtitle}>
          No events yet – Tap + to create one!
        </Text>
        <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreateEvent}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.emptyCreateButtonGradient}
          >
            <Text style={styles.emptyCreateButtonText}>Create Event</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.loadingText}>Loading events...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <BlurView intensity={30} tint="light">
          <View style={styles.header}>
            {filter ? (
              // Show back button and title when filtering
              <>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{screenTitle}</Text>
                <View style={styles.headerSpacer} />
              </>
            ) : (
              // Show normal header when not filtering
              <>
                <View style={styles.headerSpacer} />
                <Image
                  source={require('../../assets/Meetlogowhite.png')}
                  style={styles.appLogo}
                  resizeMode="contain"
                />
                <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                  <Image source={{ uri: user?.image || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=80' }} style={styles.profileImage} />
                  <View style={styles.profileRing} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </BlurView>
      </View>

      {/* Full Screen Event Cards */}
      <FlatList
        ref={flatListRef}
        data={events.length > 0 ? events : [null]} // Show empty state if no events
        renderItem={({ item, index }) =>
          item ? <EventCard event={item} index={index} /> : renderEmptyState()
        }
        keyExtractor={(item, index) => item?.id || `empty-${index}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height * 0.75} // Match card height
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.fullScreenList}
        contentContainerStyle={{ 
          paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 90 
        }}
      />

      {/* Page Indicators */}
      {events.length > 1 && (
        <View style={styles.pageIndicators}>
          {events.map((_, index) => (
            <View
              key={index}
              style={[
                styles.pageIndicator,
                currentIndex === index && styles.activePageIndicator
              ]}
            />
          ))}
        </View>
      )}

      {/* Enhanced Glassmorphic Floating Action Button */}
      <View style={styles.fab}>
        <TouchableOpacity
          onPress={handleCreateEvent}
          activeOpacity={0.8}
          style={styles.fabTouchable}
        >
          <BlurView intensity={100} style={styles.fabBlur}>
            <View style={styles.fabGlassContent}>
              <Ionicons name="add" size={28} color={Colors.white} />
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Simple Profile Modal */}
      {showProfileModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowProfileModal(false)}
          />
          <BlurView intensity={100} style={styles.profileModal}>
            <View style={styles.profileModalContent}>
              <Image source={{ uri: user?.image || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=160' }} style={styles.modalAvatar} />
              <Text style={styles.modalName}>{user?.name || 'User'}</Text>
              <Text style={styles.modalEmail}>{user?.email || ''}</Text>

              <TouchableOpacity style={styles.modalButton} onPress={handleSettingsPress}>
                <Ionicons name="person" size={24} color={Colors.white} />
                <Text style={styles.modalButtonText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.logoutButton]} onPress={handleLogoutPress}>
                <Ionicons name="log-out-outline" size={24} color={Colors.systemRed} />
                <Text style={[styles.modalButtonText, { color: Colors.systemRed }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  fullScreenList: {
    flex: 1,
  },
  fullScreenCard: {
    width,
    height: height * 0.75, // Make cards 75% of screen height
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    overflow: 'visible', // 👈 allow logo to bleed outside if necessary
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs, // Keeps the header small
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    minHeight: 64, // Optional: Ensures profile doesn't touch top edge
  },
  
  headerSpacer: {
    width: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    flex: 1,
  },
  appLogo: {
    width: 240,
    height: 64,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderRadius: 10,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.6,
  },
  eventCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Shadows.large,
  },
  cardBackground: {
    flex: 1,
    borderRadius: BorderRadius.xl,
  },
  cardBackgroundImage: {
    borderRadius: BorderRadius.xl,
  },
  cardBlur: {
    flex: 1,
    borderRadius: BorderRadius.xl,
  },
  cardGlassLayer: {
    flex: 1,
    borderRadius: BorderRadius.xl,
  },
  weatherWidget: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  weatherBlur: {
    borderRadius: BorderRadius.md,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: 4,
  },
  weatherText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  hostingBadge: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  hostingBadgeBlur: {
    borderRadius: BorderRadius.md,
  },
  hostingBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: 4,
  },
  hostingText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  textReadabilityGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl, // Adjust for bordered card design
  },
  cardContent: {
    gap: Spacing.lg,
  },
  textContainer: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.small,
  },
  textContainerInner: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  eventTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventDate: {
    fontSize: FontSize.lg,
    color: Colors.white,
    marginBottom: Spacing.sm,
    fontWeight: FontWeight.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventLocation: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeeAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.white,
    overflow: 'hidden',
    backgroundColor: Colors.gray,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.8,
  },
  moreAttendees: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -12,
  },
  moreAttendeesText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  attendeeCountText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pageIndicators: {
    position: 'absolute',
    right: Spacing.lg,
    top: '50%',
    transform: [{ translateY: -50 }],
    zIndex: 98,
    gap: Spacing.sm,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activePageIndicator: {
    backgroundColor: Colors.white,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...Shadows.large,
    zIndex: 97,
  },
  fabTouchable: {
    flex: 1,
  },
  fabBlur: {
    flex: 1,
    borderRadius: 28,
  },
  fabGlassContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyCreateButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  emptyCreateButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyCreateButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  // Simple Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 200,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileModal: {
    width: width * 0.8,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  profileModalContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing.md,
  },
  modalName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  modalEmail: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.xl,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.md,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    marginTop: Spacing.md,
  },
  modalButtonText: {
    fontSize: FontSize.md,
    color: Colors.white,
    fontWeight: FontWeight.medium,
  },
  attendeeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
});

export default EventListScreen; 