import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadows } from '../../constants';
import { NotificationSourceType } from '../../types';

interface ActivitySearchProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: NotificationSourceType[]) => void;
  placeholder?: string;
}

const ActivitySearch: React.FC<ActivitySearchProps> = ({
  onSearch,
  onFilterChange,
  placeholder = "Search activity...",
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<NotificationSourceType[]>([]);
  const [filterAnimation] = useState(new Animated.Value(0));

  const filterOptions = [
    { 
      type: NotificationSourceType.FRIEND_REQUEST, 
      label: 'Friend Requests', 
      icon: 'person-add',
      color: Colors.systemGreen 
    },
    { 
      type: NotificationSourceType.PRIVATE_INVITATION, 
      label: 'Invitations', 
      icon: 'mail',
      color: Colors.primary 
    },
    { 
      type: NotificationSourceType.EVENT_UPDATE, 
      label: 'Event Updates', 
      icon: 'information-circle',
      color: Colors.systemOrange 
    },
    { 
      type: NotificationSourceType.EVENT_REMINDER, 
      label: 'Reminders', 
      icon: 'time',
      color: Colors.systemBlue 
    },
    { 
      type: NotificationSourceType.COMMENT, 
      label: 'Comments', 
      icon: 'chatbubble',
      color: Colors.systemPurple 
    },
    { 
      type: NotificationSourceType.MENTION, 
      label: 'Mentions', 
      icon: 'at',
      color: Colors.systemPurple 
    },
  ];

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    
    Animated.timing(filterAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleFilter = (filterType: NotificationSourceType) => {
    const newFilters = selectedFilters.includes(filterType)
      ? selectedFilters.filter(f => f !== filterType)
      : [...selectedFilters, filterType];
    
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    onFilterChange([]);
  };

  const filterHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  const filterOpacity = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <BlurView intensity={80} style={styles.searchBlur}>
          <View style={styles.searchContent}>
            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
            
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCorrect={false}
              autoCapitalize="none"
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearchChange('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={toggleFilters}
              style={[styles.filterButton, selectedFilters.length > 0 && styles.filterButtonActive]}
            >
              <Ionicons 
                name={showFilters ? "filter" : "filter-outline"} 
                size={20} 
                color={selectedFilters.length > 0 ? Colors.primary : "rgba(255, 255, 255, 0.6)"} 
              />
              {selectedFilters.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{selectedFilters.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* Filter Options */}
      <Animated.View 
        style={[
          styles.filtersContainer, 
          { 
            height: filterHeight,
            opacity: filterOpacity 
          }
        ]}
      >
        <BlurView intensity={60} style={styles.filtersBlur}>
          <View style={styles.filtersContent}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filter by type</Text>
              {selectedFilters.length > 0 && (
                <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                  <Text style={styles.clearFiltersText}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.filterChips}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  onPress={() => toggleFilter(option.type)}
                  style={[
                    styles.filterChip,
                    selectedFilters.includes(option.type) && [
                      styles.filterChipActive,
                      { borderColor: option.color }
                    ]
                  ]}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={14} 
                    color={selectedFilters.includes(option.type) ? option.color : "rgba(255, 255, 255, 0.6)"} 
                  />
                  <Text style={[
                    styles.filterChipText,
                    selectedFilters.includes(option.type) && { color: option.color }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  searchBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.white,
    paddingVertical: Spacing.xs,
  },
  clearButton: {
    padding: 2,
  },
  filterButton: {
    position: 'relative',
    padding: 4,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: BorderRadius.sm,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  filtersContainer: {
    overflow: 'hidden',
    paddingHorizontal: Spacing.xl,
  },
  filtersBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  filtersContent: {
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  filtersTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  clearFiltersButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default ActivitySearch; 