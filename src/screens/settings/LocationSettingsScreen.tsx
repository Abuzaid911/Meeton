import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../../contexts/LocationContext';
import { LocationSharingComponent } from '../../components/location/LocationSharingComponent';
import { NearbyUsersComponent } from '../../components/location/NearbyUsersComponent';
import { useAuth } from '../../contexts/AuthContext';
import { LocationSharingLevel, LocationShareSettings } from '../../types';

export default function LocationSettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    permissionStatus,
    locationServicesEnabled,
    isSharing,
    sharingSettings,
    currentLocation,
    batteryOptimized,
    isConnected,
    nearbyUsers,
    requestPermission,
    stopSharing,
    connectWebSocket,
    disconnectWebSocket,
  } = useLocation();

  const [activeTab, setActiveTab] = useState<'sharing' | 'nearby' | 'settings'>('sharing');

  const handleSharingChange = (settings: LocationShareSettings) => {
    console.log('Sharing settings changed:', settings);
  };

  const handleUserSelect = (user: any) => {
    Alert.alert(
      user.name,
      `Distance: ${user.distance}m away`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Profile', onPress: () => navigation.navigate('Profile', { userId: user.userId }) },
      ]
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sharing':
        return (
          <LocationSharingComponent
            currentUser={user!}
            onSharingChange={handleSharingChange}
          />
        );
      case 'nearby':
        return (
          <NearbyUsersComponent
            currentUser={user!}
            onUserSelect={handleUserSelect}
          />
        );
      case 'settings':
        return renderSettingsTab();
      default:
        return null;
    }
  };

  const renderSettingsTab = () => (
    <ScrollView style={styles.settingsContainer}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Permissions</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="location-outline" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Location Access</Text>
              <Text style={styles.settingDescription}>
                {permissionStatus.granted ? 'Granted' : 'Not granted'}
              </Text>
            </View>
          </View>
          {!permissionStatus.granted && (
            <TouchableOpacity style={styles.actionButton} onPress={requestPermission}>
              <Text style={styles.actionButtonText}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="settings-outline" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Location Services</Text>
              <Text style={styles.settingDescription}>
                {locationServicesEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Ionicons name="location" size={20} color={currentLocation ? "#4CAF50" : "#ccc"} />
            <Text style={styles.statusLabel}>Location</Text>
            <Text style={styles.statusValue}>
              {currentLocation ? 'Available' : 'Unavailable'}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Ionicons name="share" size={20} color={isSharing ? "#4CAF50" : "#ccc"} />
            <Text style={styles.statusLabel}>Sharing</Text>
            <Text style={styles.statusValue}>
              {isSharing ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Ionicons name="wifi" size={20} color={isConnected ? "#4CAF50" : "#ccc"} />
            <Text style={styles.statusLabel}>Connection</Text>
            <Text style={styles.statusValue}>
              {isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <Ionicons name="people" size={20} color={nearbyUsers.length > 0 ? "#4CAF50" : "#ccc"} />
            <Text style={styles.statusLabel}>Nearby</Text>
            <Text style={styles.statusValue}>
              {nearbyUsers.length} users
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="battery-half" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Battery Optimization</Text>
              <Text style={styles.settingDescription}>
                {batteryOptimized ? 'Enabled - Lower accuracy, longer battery life' : 'Disabled - Higher accuracy, more battery usage'}
              </Text>
            </View>
          </View>
          <Text style={styles.statusBadge}>
            {batteryOptimized ? 'ON' : 'OFF'}
          </Text>
        </View>

        <TouchableOpacity style={styles.settingItem} onPress={isConnected ? disconnectWebSocket : connectWebSocket}>
          <View style={styles.settingInfo}>
            <Ionicons name="wifi" size={24} color="#666" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Real-time Updates</Text>
              <Text style={styles.settingDescription}>
                {isConnected ? 'Connected for live location updates' : 'Tap to connect for real-time features'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {isSharing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Sharing</Text>
          
          <View style={styles.sharingInfo}>
            <Text style={styles.sharingLevel}>
              Sharing with: {LiveLocationService.formatSharingLevel(sharingSettings.sharingLevel)}
            </Text>
            {sharingSettings.sharingExpiresAt && (
              <Text style={styles.sharingExpiry}>
                Expires: {sharingSettings.sharingExpiresAt.toLocaleString()}
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.stopSharingButton} onPress={stopSharing}>
            <Ionicons name="stop" size={20} color="#fff" />
            <Text style={styles.stopSharingText}>Stop Sharing</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sharing' && styles.activeTab]}
          onPress={() => setActiveTab('sharing')}
        >
          <Ionicons 
            name="share-outline" 
            size={20} 
            color={activeTab === 'sharing' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'sharing' && styles.activeTabText]}>
            Sharing
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'nearby' && styles.activeTab]}
          onPress={() => setActiveTab('nearby')}
        >
          <Ionicons 
            name="people-outline" 
            size={20} 
            color={activeTab === 'nearby' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'nearby' && styles.activeTabText]}>
            Nearby
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings-outline" 
            size={20} 
            color={activeTab === 'settings' ? '#2196F3' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  settingsContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  statusItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sharingInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e8f5e8',
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sharingLevel: {
    fontSize: 16,
    color: '#2e7d32',
    fontWeight: '600',
  },
  sharingExpiry: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stopSharingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  stopSharingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 