import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../constants';
import APIService from '../services/api';
import { debounce } from 'lodash';

interface SearchResult {
  type: 'user' | 'event';
  data: any;
}

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const filters = [
    { id: 'all', name: 'All', icon: 'grid' },
    { id: 'events', name: 'Events', icon: 'calendar' },
    { id: 'users', name: 'People', icon: 'people' },
  ];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, filter: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setLoading(true);
      setHasSearched(true);

      try {
        const results: SearchResult[] = [];

        // Search based on filter
        if (filter === 'all' || filter === 'events') {
          const events = await APIService.searchEvents(query, { limit: 10 });
          if (events) {
            results.push(...events.map(event => ({ type: 'event' as const, data: event })));
          }
        }

        if (filter === 'all' || filter === 'users') {
          const users = await APIService.searchUsers(query, 10);
          if (users) {
            results.push(...users.map(user => ({ type: 'user' as const, data: user })));
          }
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Error', 'Failed to search. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery, selectedFilter);
  }, [searchQuery, selectedFilter, debouncedSearch]);

  const handleUserPress = (user: any) => {
                (navigation as any).navigate('UserProfile', {
        userId: user.id
    });
  };

  const handleEventPress = (event: any) => {
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  const formatDate = (date: string) => {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const GlassButton: React.FC<{
    title: string;
    onPress: () => void;
    isActive?: boolean;
    icon?: string;
  }> = ({ title, onPress, isActive = false, icon }) => (
    <TouchableOpacity 
      style={[styles.filterButton, isActive && styles.filterButtonActive]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} style={styles.filterButtonBlur}>
        <View style={[
          styles.filterButtonContent,
          isActive && styles.filterButtonContentActive
        ]}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={16} 
              color={isActive ? Colors.white : 'rgba(255, 255, 255, 0.7)'} 
            />
          )}
          <Text style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive
          ]}>
            {title}
          </Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const UserResult: React.FC<{ user: any }> = ({ user }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => handleUserPress(user)}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} style={styles.resultBlur}>
        <View style={styles.resultContent}>
          <Image
            source={{ uri: user.image || 'https://via.placeholder.com/50' }}
            style={styles.userAvatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name || user.username}</Text>
            <Text style={styles.userUsername}>@{user.username}</Text>
            {user.bio && <Text style={styles.userBio} numberOfLines={1}>{user.bio}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const EventResult: React.FC<{ event: any }> = ({ event }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => handleEventPress(event)}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} style={styles.resultBlur}>
        <View style={styles.resultContent}>
          <View style={[styles.eventIcon, { backgroundColor: event.headerColor || Colors.primary }]}>
            <Ionicons name="calendar" size={24} color={Colors.white} />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
            <Text style={styles.eventDate}>{formatDate(event.date)} • {event.time}</Text>
            <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <BlurView intensity={60} style={styles.emptyIconBlur}>
              <View style={styles.emptyIconContent}>
                <Ionicons name="search" size={48} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </BlurView>
          </View>
          <Text style={styles.emptyTitle}>Start Searching</Text>
          <Text style={styles.emptySubtitle}>
            Search for events, people, or places to discover amazing experiences
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <BlurView intensity={60} style={styles.emptyIconBlur}>
              <View style={styles.emptyIconContent}>
                <Ionicons name="sad-outline" size={48} color="rgba(255, 255, 255, 0.6)" />
              </View>
            </BlurView>
          </View>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptySubtitle}>
            Try different keywords or adjust your filters
          </Text>
        </View>
      );
    }

    // Group results by type
    const userResults = searchResults.filter(r => r.type === 'user');
    const eventResults = searchResults.filter(r => r.type === 'event');

    return (
      <View style={styles.resultsContainer}>
        {eventResults.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Events ({eventResults.length})</Text>
            {eventResults.map((result, index) => (
              <EventResult key={`event-${index}`} event={result.data} />
            ))}
          </View>
        )}

        {userResults.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>People ({userResults.length})</Text>
            {userResults.map((result, index) => (
              <UserResult key={`user-${index}`} user={result.data} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <Text style={styles.subtitle}>Discover events and connect with people</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <BlurView intensity={80} style={styles.searchBlur}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search events, people, places..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            <View style={styles.filtersContent}>
              {filters.map((filter) => (
                <GlassButton
                  key={filter.id}
                  title={filter.name}
                  icon={filter.icon}
                  isActive={selectedFilter === filter.id}
                  onPress={() => setSelectedFilter(filter.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Results */}
        {renderResults()}
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
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  searchBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    // Remove shadow from BlurView to avoid performance warning
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 24,
  },
  filtersContainer: {
    marginBottom: Spacing.xl,
  },
  filtersScroll: {
    paddingLeft: Spacing.xl,
  },
  filtersContent: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  filterButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    // Remove shadow to avoid performance warning on BlurView
  },
  filterButtonActive: {
    transform: [{ scale: 0.95 }],
  },
  filterButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: Spacing.xs,
  },
  filterButtonContentActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  filterButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  filterButtonTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    // Remove shadow to avoid performance warning on BlurView
  },
  emptyIconBlur: {
    flex: 1,
    borderRadius: 50,
  },
  emptyIconContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.xl,
  },
  resultSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  resultCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    // Remove shadow to avoid performance warning on BlurView
  },
  resultBlur: {
    borderRadius: BorderRadius.lg,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    marginBottom: Spacing.xs / 2,
  },
  userUsername: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.xs / 2,
  },
  userBio: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  eventIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    marginBottom: Spacing.xs / 2,
  },
  eventDate: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginBottom: Spacing.xs / 2,
  },
  eventLocation: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default SearchScreen; 