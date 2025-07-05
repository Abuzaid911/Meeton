import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../contexts/LocationContext';
import { LiveLocationService } from '../../services/liveLocationService';
import { NearbyUser, NearbyUsersProps } from '../../types';

interface NearbyUserItemProps {
  user: NearbyUser;
  onPress: () => void;
}

function NearbyUserItem({ user, onPress }: NearbyUserItemProps) {
  const getDistanceColor = (distance: number) => {
    if (distance < 100) return '#4CAF50'; // Very close - green
    if (distance < 500) return '#FF9800'; // Nearby - orange
    return '#666'; // Far - gray
  };

  const getDistanceIcon = (distance: number) => {
    if (distance < 100) return 'location';
    if (distance < 500) return 'radio-outline';
    return 'radio-button-off-outline';
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <TouchableOpacity style={styles.userItem} onPress={onPress}>
      <View style={styles.userAvatar}>
        {user.image ? (
          <img src={user.image} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={24} color="#666" />
        )}
        {user.isAtEvent && (
          <View style={styles.eventBadge}>
            <Ionicons name="calendar" size={12} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <View style={styles.userDetails}>
          <View style={styles.distanceContainer}>
            <Ionicons 
              name={getDistanceIcon(user.distance)} 
              size={14} 
              color={getDistanceColor(user.distance)} 
            />
            <Text style={[styles.distance, { color: getDistanceColor(user.distance) }]}>
              {LiveLocationService.formatDistance(user.distance)}
            </Text>
          </View>
          <Text style={styles.lastSeen}>
            {formatLastSeen(user.lastSeen)}
          </Text>
        </View>
        {user.isAtEvent && (
          <Text style={styles.eventText}>At same event</Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );
}

export function NearbyUsersComponent({ currentUser, onUserSelect, radius = 1000 }: NearbyUsersProps) {
  const {
    nearbyUsers,
    currentLocation,
    permissionStatus,
    isSharing,
    isConnected,
    getNearbyUsers,
    requestPermission,
    refreshLocation,
  } = useLocation();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(radius);

  useEffect(() => {
    if (permissionStatus.granted && currentLocation) {
      loadNearbyUsers();
    }
  }, [permissionStatus.granted, currentLocation, selectedRadius, isSharing]);

  const loadNearbyUsers = useCallback(async () => {
    if (!permissionStatus.granted || !currentLocation) return;
    
    setIsLoading(true);
    try {
      await getNearbyUsers(selectedRadius);
    } catch (error) {
      console.error('Error loading nearby users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [permissionStatus.granted, currentLocation, selectedRadius, getNearbyUsers]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshLocation();
      await loadNearbyUsers();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshLocation, loadNearbyUsers]);

  const handleUserPress = useCallback((user: NearbyUser) => {
    onUserSelect?.(user);
  }, [onUserSelect]);

  const handleRadiusChange = (newRadius: number) => {
    setSelectedRadius(newRadius);
  };

  const requestLocationPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Location permission is needed to find nearby users.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderRadiusSelector = () => (
    <View style={styles.radiusSelector}>
      <Text style={styles.radiusSelectorTitle}>Search radius:</Text>
      <View style={styles.radiusOptions}>
        {[500, 1000, 2000, 5000].map((radiusOption) => (
          <TouchableOpacity
            key={radiusOption}
            style={[
              styles.radiusOption,
              selectedRadius === radiusOption && styles.radiusOptionSelected,
            ]}
            onPress={() => handleRadiusChange(radiusOption)}
          >
            <Text style={[
              styles.radiusOptionText,
              selectedRadius === radiusOption && styles.radiusOptionTextSelected,
            ]}>
              {LiveLocationService.formatDistance(radiusOption)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Ionicons name="people-outline" size={24} color="#2196F3" />
        <Text style={styles.title}>Nearby Users</Text>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot,
            { backgroundColor: isConnected ? '#4CAF50' : '#f44336' }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>
      
      {!isSharing && (
        <View style={styles.warningContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#FF9800" />
          <Text style={styles.warningText}>
            You're not sharing your location. Start sharing to see nearby users.
          </Text>
        </View>
      )}
      
      {renderRadiusSelector()}
    </View>
  );

  const renderEmpty = () => {
    if (!permissionStatus.granted) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>Location Permission Required</Text>
          <Text style={styles.emptyText}>
            Allow location access to find nearby users
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestLocationPermission}>
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentLocation) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>Getting Your Location</Text>
          <Text style={styles.emptyText}>
            Please wait while we determine your location
          </Text>
          <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
        </View>
      );
    }

    if (!isSharing) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="eye-off-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>Location Sharing Disabled</Text>
          <Text style={styles.emptyText}>
            Start sharing your location to see nearby users
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>No Nearby Users</Text>
        <Text style={styles.emptyText}>
          No users found within {LiveLocationService.formatDistance(selectedRadius)}
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={16} color="#2196F3" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: NearbyUser }) => (
    <NearbyUserItem user={item} onPress={() => handleUserPress(item)} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={nearbyUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      {isLoading && !isRefreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  connectionText: {
    fontSize: 12,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#e65100',
    marginLeft: 8,
    flex: 1,
  },
  radiusSelector: {
    marginTop: 8,
  },
  radiusSelectorTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  radiusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  radiusOptionSelected: {
    backgroundColor: '#2196F3',
  },
  radiusOptionText: {
    fontSize: 12,
    color: '#666',
  },
  radiusOptionTextSelected: {
    color: '#fff',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  eventBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  lastSeen: {
    fontSize: 12,
    color: '#999',
  },
  eventText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#2196F3',
    fontSize: 16,
    marginLeft: 4,
  },
  loader: {
    marginTop: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 