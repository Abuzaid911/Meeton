import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Calendar } from 'react-native-calendars';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '../constants';
import { Event } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { APIService } from '../services/api';

const { width } = Dimensions.get('window');

interface CalendarScreenProps {
  navigation: any;
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    try {
      const fetchedEvents = await APIService.getEvents();
      if (fetchedEvents) {
        // Convert string dates to Date objects
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
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [])
  );

  // Get events for selected date
  const getEventsForDate = (date: string) => {
    return events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === date;
    });
  };

  // Separate events into hosting and attending
  const getEventsSeparated = (eventsForDate: Event[]) => {
    const hosting = eventsForDate.filter(event => event.hostId === user?.id);
    const attending = eventsForDate.filter(event => {
      if (event.hostId === user?.id) return false;
      return event.attendees?.some(attendee => 
        attendee.user.id === user?.id && attendee.rsvp === 'YES'
      );
    });
    return { hosting, attending };
  };

  // Create marked dates object for calendar
  const getMarkedDates = () => {
    const marked: any = {};
    
    // Mark dates with events I'm hosting or attending
    events.forEach(event => {
      const isHosting = event.hostId === user?.id;
      const isAttending = event.attendees?.some(attendee => 
        attendee.user.id === user?.id && attendee.rsvp === 'YES'
      );
      
      // Only mark dates where user is hosting or attending
      if (isHosting || isAttending) {
        const dateKey = new Date(event.date).toISOString().split('T')[0];
        if (!marked[dateKey]) {
          marked[dateKey] = { 
            marked: true, 
            dotColor: Colors.primary,
            dots: []
          };
        }
      }
    });

    // Mark selected date
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: Colors.primary,
      selectedTextColor: Colors.white,
    };

    return marked;
  };

  const formatTime = (time: string) => {
    return time;
  };

  const EventCard: React.FC<{ event: Event; isHosting: boolean }> = ({ event, isHosting }) => {
    const handlePress = () => {
      navigation.navigate('EventDetails', { eventId: event.id });
    };

    const getRSVPStatus = () => {
      if (isHosting) return null;
      const userAttendee = event.attendees?.find(a => a.user.id === user?.id);
      return userAttendee?.rsvp || 'MAYBE';
    };

    const rsvpStatus = getRSVPStatus();

    return (
      <TouchableOpacity onPress={handlePress} style={styles.eventCard} activeOpacity={0.8}>
        <BlurView intensity={60} style={styles.eventCardBlur}>
          <View style={styles.eventCardContent}>
            <View style={styles.eventCardHeader}>
              <View style={styles.eventTitleContainer}>
                <Text style={styles.eventTitle}>{event.name}</Text>
                {isHosting && (
                  <View style={styles.hostingBadge}>
                    <Ionicons name="star" size={12} color={Colors.systemYellow} />
                    <Text style={styles.hostingText}>Host</Text>
                  </View>
                )}
              </View>
              {rsvpStatus && (
                <View style={[
                  styles.rsvpBadge,
                  rsvpStatus === 'YES' ? styles.rsvpYes : 
                  rsvpStatus === 'NO' ? styles.rsvpNo : styles.rsvpMaybe
                ]}>
                  <Text style={[
                    styles.rsvpText,
                    rsvpStatus === 'YES' ? styles.rsvpYesText : 
                    rsvpStatus === 'NO' ? styles.rsvpNoText : styles.rsvpMaybeText
                  ]}>
                    {rsvpStatus === 'YES' ? 'Going' : rsvpStatus === 'NO' ? 'Not Going' : 'Maybe'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.eventDetailText}>{formatTime(event.time)}</Text>
              </View>
              <View style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.eventDetailText} numberOfLines={1}>{event.location}</Text>
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const eventsForSelectedDate = getEventsForDate(selectedDate);
  const { hosting, attending } = getEventsSeparated(eventsForSelectedDate);

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
        <Text style={styles.headerTitle}>Calendar</Text>
        {/* <TouchableOpacity style={styles.todayButton} onPress={() => {
          const today = new Date().toISOString().split('T')[0];
          setSelectedDate(today);
        }}>
          <BlurView intensity={60} tint="dark" style={styles.headerButtonBlur}>
            <Text style={styles.todayText}>Today</Text>
          </BlurView>
        </TouchableOpacity> */}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <BlurView intensity={40} style={styles.calendarBlur}>
            <Calendar
              current={selectedDate}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={getMarkedDates()}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: Colors.white,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.primary,
                dayTextColor: Colors.white,
                textDisabledColor: 'rgba(255, 255, 255, 0.3)',
                dotColor: Colors.primary,
                selectedDotColor: Colors.white,
                arrowColor: Colors.white,
                monthTextColor: Colors.white,
                indicatorColor: Colors.primary,
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              enableSwipeMonths={true}
              hideExtraDays={true}
              firstDay={1}
              showWeekNumbers={false}
              style={styles.calendar}
            />
          </BlurView>
        </View>

        {/* Events List */}
        <View style={styles.eventsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : (
            <>
              {/* Selected Date Header */}
              <View style={styles.selectedDateHeader}>
                <Text style={styles.selectedDateText}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                {eventsForSelectedDate.length > 0 && (
                  <View style={styles.eventCountBadge}>
                    <Text style={styles.eventCountText}>{eventsForSelectedDate.length}</Text>
                  </View>
                )}
              </View>

              {eventsForSelectedDate.length === 0 ? (
                <View style={styles.noEventsContainer}>
                  <BlurView intensity={20} style={styles.noEventsBlur}>
                    <Ionicons name="calendar-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                    <Text style={styles.noEventsTitle}>No Events</Text>
                    <Text style={styles.noEventsSubtitle}>No events scheduled for this day</Text>
                  </BlurView>
                </View>
              ) : (
                <>
                  {/* Events I'm Hosting */}
                  {hosting.length > 0 && (
                    <View style={styles.eventsSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="star" size={20} color={Colors.systemYellow} />
                        <Text style={styles.sectionTitle}>Events I'm Hosting</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{hosting.length}</Text>
                        </View>
                      </View>
                      {hosting.map((event) => (
                        <EventCard key={event.id} event={event} isHosting={true} />
                      ))}
                    </View>
                  )}

                  {/* Events I'm Attending */}
                  {attending.length > 0 && (
                    <View style={styles.eventsSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="people" size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Events I'm Attending</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{attending.length}</Text>
                        </View>
                      </View>
                      {attending.map((event) => (
                        <EventCard key={event.id} event={event} isHosting={false} />
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
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
    paddingTop: 44,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  todayButton: {
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
  },
  headerButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    bottom: 28,
  },
  todayText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  calendarContainer: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  calendarBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  calendar: {
    paddingBottom: Spacing.lg,
  },
  eventsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  selectedDateText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  eventCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  eventCountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  noEventsContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  noEventsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: Spacing.xl,
    alignItems: 'center',
  },
  noEventsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginTop: Spacing.md,
  },
  noEventsSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  eventsSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.round,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  sectionBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  eventCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  eventCardBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventCardContent: {
    padding: Spacing.lg,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  eventTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eventTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    flex: 1,
  },
  hostingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  hostingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.systemYellow,
  },
  rsvpBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  rsvpYes: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  rsvpNo: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  rsvpMaybe: {
    backgroundColor: 'rgba(255, 204, 0, 0.2)',
  },
  rsvpText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  rsvpYesText: {
    color: Colors.systemGreen,
  },
  rsvpNoText: {
    color: Colors.systemRed,
  },
  rsvpMaybeText: {
    color: Colors.systemYellow,
  },
  eventDetails: {
    gap: Spacing.xs,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eventDetailText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
});

export default CalendarScreen; 