import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../constants';
import { Event, User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { APIService } from '../services/api';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - (Spacing.xl * 2); // Slightly smaller for better side margins
const CARD_HEIGHT = height * 0.68; // Adjusted height for better proportions
const CARD_SPACING = Spacing.lg;

interface EventCardProps {
  event: Event;
  onPress: () => void;
  index: number;
  scrollX: Animated.Value;
  currentUserId?: string;
}

const EventCard: React.FC<EventCardProps> = ({ event, onPress, index, scrollX, currentUserId }) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  // Animated scale effect based on scroll position
  const inputRange = [
    (index - 1) * (CARD_WIDTH + CARD_SPACING),
    index * (CARD_WIDTH + CARD_SPACING),
    (index + 1) * (CARD_WIDTH + CARD_SPACING),
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.85, 1, 0.85],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.6, 1, 0.6],
    extrapolate: 'clamp',
  });

  const renderHeader = () => {
    if (event.headerType === 'image' && event.headerImageUrl) {
      return (
        <Image 
          source={{ uri: event.headerImageUrl }} 
          style={styles.cardHeaderImage}
          resizeMode="cover"
        />
      );
    } else if (event.headerType === 'color' && event.headerColor) {
      return (
        <LinearGradient
          colors={[event.headerColor, `${event.headerColor}CC`] as [string, string]}
          style={styles.cardHeaderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    } else {
      // Default gradient
      return (
        <LinearGradient
          colors={Colors.gradients.sunset as [string, string]}
          style={styles.cardHeaderGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      );
    }
  };

  const attendeeCount = event.attendees?.filter(a => a.rsvp === 'YES').length || 0;
  const isHosting = event.hostId === currentUserId;

  return (
    <Animated.View 
      style={[
        styles.cardContainer,
        {
          transform: [{ scale }],
          opacity,
        }
      ]}
    >
      <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.95}>
        <View style={styles.cardContent}>
          {/* Background Image/Gradient */}
          <View style={styles.cardBackground}>
            {renderHeader()}
            
            {/* Enhanced overlay gradient for better text readability */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)'] as [string, string, string, string]}
              style={styles.overlayGradient}
              locations={[0, 0.4, 0.7, 1]}
            />
          </View>

          {/* Hosting Badge with enhanced styling */}
          {isHosting && (
            <View style={styles.hostingBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500'] as [string, string]}
                style={styles.hostingBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={16} color={Colors.white} />
                <Text style={styles.hostingText}>Hosting</Text>
              </LinearGradient>
            </View>
          )}

          {/* Enhanced Attendee Avatars with glow effect */}
          {event.attendees && event.attendees.length > 0 && (
            <View style={styles.attendeeAvatars}>
              <View style={styles.avatarGlow} />
              {event.attendees.slice(0, 8).map((attendee, avatarIndex) => {
                // Create a more natural circular arrangement
                const angle = (avatarIndex * 360) / Math.min(8, event.attendees!.length);
                const radius = 50;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius * 0.4; // Flatten the circle
                
                return (
                  <View 
                    key={attendee.id} 
                    style={[
                      styles.avatarContainer,
                      {
                        position: 'absolute',
                        left: x,
                        top: y,
                        zIndex: 10 - avatarIndex, // Stack them properly
                      }
                    ]}
                  >
                    <Image 
                      source={{ uri: attendee.user.image || 'https://via.placeholder.com/40' }} 
                      style={styles.avatar}
                    />
                  </View>
                );
              })}
              {attendeeCount > 8 && (
                <View style={[styles.avatarContainer, styles.moreAvatars, { position: 'absolute', left: 55, top: 15, zIndex: 1 }]}>
                  <Text style={styles.moreAvatarsText}>+{attendeeCount - 8}</Text>
                </View>
              )}
            </View>
          )}

          {/* Enhanced Event Info with better typography */}
          <View style={styles.cardInfo}>
            <Text style={styles.eventTitle}>{event.name}</Text>
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.white} />
                <Text style={styles.eventDateTime}>
                  {formatDate(event.date)}, {formatTime(event.time)}
                </Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={16} color={Colors.white} />
                <Text style={styles.eventLocation}>{event.location}</Text>
              </View>
            </View>
            
            {/* Attendee count indicator */}
            {attendeeCount > 0 && (
              <View style={styles.attendeeCountBadge}>
                <Ionicons name="people" size={14} color={Colors.white} />
                <Text style={styles.attendeeCountText}>
                  {attendeeCount} Going
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const loadEvents = async () => {
    try {
      const fetchedEvents = await APIService.getEvents();
      if (fetchedEvents) {
        // Convert string dates to Date objects and cast to correct type
        const eventsWithDateObjects = fetchedEvents.map(event => ({
          ...event,
          date: new Date(event.date),
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt),
        })) as Event[];
        setEvents(eventsWithDateObjects);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    loadEvents();
  }, [user]);

  // Refresh events when screen comes into focus (e.g. after creating a new event)
  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [user])
  );

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const handleCreateEvent = () => {
    navigation.navigate('Create');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (CARD_WIDTH + CARD_SPACING));
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.black} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Upcoming</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.white} style={styles.chevronIcon} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleCreateEvent} style={styles.createButton}>
            <Ionicons name="add" size={26} color={Colors.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Image 
              source={{ uri: user?.image || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=80' }} 
              style={styles.profileImage}
            />
            <View style={styles.profileBadge}>
              <View style={styles.profileBadgeInner} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Page Indicator */}
      {events.length > 1 && (
        <View style={styles.pageIndicator}>
          {events.map((_, index) => (
            <View
              key={index}
              style={[
                styles.pageIndicatorDot,
                {
                  opacity: index === currentIndex ? 1 : 0.3,
                  transform: [{ scale: index === currentIndex ? 1.2 : 1 }],
                }
              ]}
            />
          ))}
        </View>
      )}

      {/* Horizontal Scrolling Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : events.length > 0 ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          snapToAlignment="start"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {events.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => handleEventPress(event.id)}
              index={index}
              scrollX={scrollX}
              currentUserId={user?.id}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color={Colors.gray3} />
          <Text style={styles.emptyTitle}>No Upcoming Events</Text>
          <Text style={styles.emptySubtitle}>Create your first event to get started!</Text>
          <TouchableOpacity style={styles.createEventButton} onPress={handleCreateEvent}>
            <Text style={styles.createEventButtonText}>Create Event</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.black,
    paddingTop: Spacing.xl,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.largeTitle,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  chevronIcon: {
    marginLeft: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'visible',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.systemYellow,
  },
  profileBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.systemGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
  },
  profileBadgeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.systemGreen,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120, // Extra padding for bottom tab bar
  },
  cardContainer: {
    width: CARD_WIDTH + CARD_SPACING,
    alignItems: 'center',
  },
  eventCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Shadows.large,
  },
  cardContent: {
    flex: 1,
    position: 'relative',
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardHeaderImage: {
    width: '100%',
    height: '100%',
  },
  cardHeaderGradient: {
    width: '100%',
    height: '100%',
  },
  overlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hostingBadge: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  hostingBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  hostingText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  attendeeAvatars: {
    position: 'absolute',
    bottom: 160,
    left: '50%',
    width: 140,
    height: 80,
    marginLeft: -70, // Center the container
  },
  avatarGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    opacity: 0.5,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.white,
    overflow: 'hidden',
    backgroundColor: Colors.gray,
    ...Shadows.small,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  moreAvatars: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarsText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  eventDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  eventDateTime: {
    fontSize: FontSize.lg,
    color: Colors.white,
    fontWeight: FontWeight.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventLocation: {
    fontSize: FontSize.lg,
    color: Colors.white,
    fontWeight: FontWeight.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  attendeeCountText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  createEventButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  createEventButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});

export default HomeScreen; 