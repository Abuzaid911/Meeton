import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../contexts/LocationContext';
import { LiveLocationService } from '../../services/liveLocationService';

export function LocationTestComponent() {
  const {
    permissionStatus,
    currentLocation,
    isSharing,
    sharingSettings,
    isConnected,
    nearbyUsers,
    requestPermission,
    getCurrentLocation,
    connectWebSocket,
  } = useLocation();

  const handleTestPermission = async () => {
    const granted = await requestPermission();
    Alert.alert('Permission Test', `Permission granted: ${granted}`);
  };

  const handleTestLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      Alert.alert('Location Test', `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`);
    } else {
      Alert.alert('Location Test', 'Failed to get location');
    }
  };

  const handleTestWebSocket = async () => {
    await connectWebSocket();
    Alert.alert('WebSocket Test', `Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Location Test</Text>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Ionicons 
            name={permissionStatus.granted ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={permissionStatus.granted ? "#4CAF50" : "#f44336"} 
          />
          <Text style={styles.statusText}>Permission: {permissionStatus.granted ? 'Granted' : 'Not granted'}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Ionicons 
            name={currentLocation ? "location" : "location-outline"} 
            size={20} 
            color={currentLocation ? "#4CAF50" : "#666"} 
          />
          <Text style={styles.statusText}>Location: {currentLocation ? 'Available' : 'Unavailable'}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Ionicons 
            name={isSharing ? "share" : "share-outline"} 
            size={20} 
            color={isSharing ? "#4CAF50" : "#666"} 
          />
          <Text style={styles.statusText}>
            Sharing: {isSharing ? LiveLocationService.formatSharingLevel(sharingSettings.sharingLevel) : 'Not sharing'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Ionicons 
            name={isConnected ? "wifi" : "wifi-outline"} 
            size={20} 
            color={isConnected ? "#4CAF50" : "#666"} 
          />
          <Text style={styles.statusText}>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</Text>
        </View>
        
        <View style={styles.statusItem}>
          <Ionicons name="people" size={20} color="#666" />
          <Text style={styles.statusText}>Nearby Users: {nearbyUsers.length}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.testButton} onPress={handleTestPermission}>
          <Text style={styles.buttonText}>Test Permission</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={handleTestLocation}>
          <Text style={styles.buttonText}>Test Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={handleTestWebSocket}>
          <Text style={styles.buttonText}>Test WebSocket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  testButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 