import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LocationMapProps } from '../../types';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export function LocationMapComponent({
  locations,
  currentLocation,
  onLocationPress,
  showCurrentLocation = true,
  followUser = false,
}: LocationMapProps) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showRadius, setShowRadius] = useState(false);
  const [radiusSize, setRadiusSize] = useState(1000); // 1km default

  useEffect(() => {
    if (mapReady && followUser && currentLocation) {
      animateToLocation(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation, mapReady, followUser]);

  useEffect(() => {
    if (mapReady && locations.length > 0) {
      fitToLocations();
    }
  }, [locations, mapReady]);

  const animateToLocation = (latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }, 1000);
  };

  const fitToLocations = () => {
    if (!mapRef.current || locations.length === 0) return;

    const allLocations = [...locations];
    if (currentLocation && showCurrentLocation) {
      allLocations.push({
        userId: 'current',
        name: 'You',
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        isCurrentUser: true,
      });
    }

    if (allLocations.length === 1) {
      animateToLocation(allLocations[0].lat, allLocations[0].lng);
      return;
    }

    const coordinates = allLocations.map(loc => ({
      latitude: loc.lat,
      longitude: loc.lng,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  const handleMarkerPress = (userId: string) => {
    if (userId !== 'current' && onLocationPress) {
      onLocationPress(userId);
    }
  };

  const toggleRadius = () => {
    setShowRadius(!showRadius);
  };

  const centerOnUser = () => {
    if (currentLocation) {
      animateToLocation(currentLocation.latitude, currentLocation.longitude);
    }
  };

  const getMarkerColor = (isCurrentUser?: boolean, isAtEvent?: boolean) => {
    if (isCurrentUser) return '#2196F3';
    if (isAtEvent) return '#4CAF50';
    return '#FF9800';
  };

  const renderMarker = (location: typeof locations[0]) => {
    const isCurrentUser = location.isCurrentUser || location.userId === 'current';
    
    return (
      <Marker
        key={location.userId}
        coordinate={{
          latitude: location.lat,
          longitude: location.lng,
        }}
        title={location.name}
        description={isCurrentUser ? 'Your location' : `Distance: ${location.distance || 0}m`}
        onPress={() => handleMarkerPress(location.userId)}
        pinColor={getMarkerColor(isCurrentUser)}
      >
        <View style={[
          styles.markerContainer,
          { backgroundColor: getMarkerColor(isCurrentUser) }
        ]}>
          {location.image ? (
            <img src={location.image} style={styles.markerImage} />
          ) : (
            <Ionicons 
              name={isCurrentUser ? "person" : "person-outline"} 
              size={20} 
              color="#fff" 
            />
          )}
          {isCurrentUser && (
            <View style={styles.currentUserPulse} />
          )}
        </View>
      </Marker>
    );
  };

  const renderCurrentLocationMarker = () => {
    if (!currentLocation || !showCurrentLocation) return null;

    return (
      <Marker
        key="current-location"
        coordinate={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }}
        title="Your Location"
        description="Current position"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.currentLocationMarker}>
          <View style={styles.currentLocationDot} />
          <View style={styles.currentLocationPulse} />
        </View>
      </Marker>
    );
  };

  const renderRadiusCircle = () => {
    if (!showRadius || !currentLocation) return null;

    return (
      <Circle
        center={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }}
        radius={radiusSize}
        strokeColor="rgba(33, 150, 243, 0.5)"
        fillColor="rgba(33, 150, 243, 0.1)"
        strokeWidth={2}
      />
    );
  };

  const initialRegion = currentLocation ? {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  } : {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false} // We'll handle this with custom marker
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        onMapReady={() => setMapReady(true)}
        mapType="standard"
        userInterfaceStyle="light"
      >
        {/* Render user markers */}
        {locations.map(renderMarker)}
        
        {/* Render current location marker */}
        {renderCurrentLocationMarker()}
        
        {/* Render radius circle */}
        {renderRadiusCircle()}
      </MapView>

      {/* Map controls */}
      <View style={styles.controls}>
        {currentLocation && (
          <TouchableOpacity style={styles.controlButton} onPress={centerOnUser}>
            <Ionicons name="locate" size={24} color="#2196F3" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.controlButton, showRadius && styles.controlButtonActive]} 
          onPress={toggleRadius}
        >
          <Ionicons name="radio-outline" size={24} color={showRadius ? "#fff" : "#2196F3"} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={fitToLocations}>
          <Ionicons name="resize-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Radius selector */}
      {showRadius && (
        <View style={styles.radiusSelector}>
          <Text style={styles.radiusSelectorTitle}>Search Radius</Text>
          <View style={styles.radiusOptions}>
            {[500, 1000, 2000, 5000].map((radius) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusOption,
                  radiusSize === radius && styles.radiusOptionSelected,
                ]}
                onPress={() => setRadiusSize(radius)}
              >
                <Text style={[
                  styles.radiusOptionText,
                  radiusSize === radius && styles.radiusOptionTextSelected,
                ]}>
                  {radius < 1000 ? `${radius}m` : `${radius / 1000}km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Location count */}
      {locations.length > 0 && (
        <View style={styles.locationCount}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.locationCountText}>
            {locations.length} user{locations.length !== 1 ? 's' : ''} nearby
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  currentUserPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    top: -10,
    left: -10,
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  currentLocationPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
    top: -9,
    left: -9,
  },
  controls: {
    position: 'absolute',
    top: 50,
    right: 16,
    flexDirection: 'column',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  controlButtonActive: {
    backgroundColor: '#2196F3',
  },
  radiusSelector: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  radiusSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
    fontSize: 14,
    color: '#666',
  },
  radiusOptionTextSelected: {
    color: '#fff',
  },
  locationCount: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  locationCountText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
}); 