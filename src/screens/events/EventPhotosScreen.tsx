import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { RSVP } from '../../types';
import APIService from '../../services/api';
import EventPhotosGallery from '../../components/events/EventPhotosGallery';
import { EventPhoto } from '../../services/imageService';
import { Ionicons } from '@expo/vector-icons';

const EventPhotosScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const eventId = route.params?.eventId;
  const [isGoing, setIsGoing] = useState(false);

  // Check if user is going to the event (can upload photos)
  const checkIsGoing = useCallback(async () => {
    try {
      const attendees = await APIService.getEventAttendees(eventId);
      if (attendees && Array.isArray(attendees)) {
        const me = attendees.find((a: any) => a.userId === user?.id);
        setIsGoing(me?.rsvp === RSVP.YES);
      } else {
        setIsGoing(false);
      }
    } catch {
      setIsGoing(false);
    }
  }, [eventId, user?.id]);

  useEffect(() => {
    checkIsGoing();
  }, [checkIsGoing]);

  const handlePhotoUploaded = (photo: EventPhoto) => {
    // Photo uploaded successfully, the gallery will update itself
    console.log('Photo uploaded:', photo);
  };

  const handleError = (error: string) => {
    Alert.alert('Error', error);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Event Photos Gallery */}
      <EventPhotosGallery
        eventId={eventId}
        canUpload={isGoing}
        onPhotoUploaded={handlePhotoUploaded}
        onError={handleError}
      />
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
    justifyContent: 'flex-start',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default EventPhotosScreen; 