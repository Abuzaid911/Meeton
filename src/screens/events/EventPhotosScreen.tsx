import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, Alert, TouchableOpacity, Text } from 'react-native';
import { Colors } from '../../constants';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useRSVP } from '../../contexts/RSVPContext';
import { RSVP } from '../../types';
import APIService from '../../services/api';
import EventPhotosGallery from '../../components/events/EventPhotosGallery';
import { EventPhoto } from '../../services/imageService';
import { Ionicons } from '@expo/vector-icons';

interface UploadPermissions {
  canUpload: boolean;
  reason?: string;
  rsvpStatus?: string;
}

const EventPhotosScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { userRSVP, setEventRSVP } = useRSVP();
  const eventId = route.params?.eventId;
  const [uploadPermissions, setUploadPermissions] = useState<UploadPermissions>({
    canUpload: false
  });
  const [loading, setLoading] = useState(true);

  // Check upload permissions for the user
  const checkUploadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      
      // First check via new permissions endpoint
      const permissions = await APIService.checkEventUploadPermissions(eventId);
      if (permissions) {
        setUploadPermissions(permissions);
        
        // Sync RSVP context with server response
        if (permissions.rsvpStatus) {
          const serverRSVP = permissions.rsvpStatus as RSVP;
          const contextRSVP = userRSVP(eventId);
          
          if (contextRSVP !== serverRSVP) {
            console.log('🔄 [RSVP DEBUG] Syncing RSVP context. Context:', contextRSVP, 'Server:', serverRSVP);
            setEventRSVP(eventId, serverRSVP);
          }
        }
      } else {
        // Fallback to old method for backward compatibility
        const attendees = await APIService.getEventAttendees(eventId);
        if (attendees && Array.isArray(attendees)) {
          const me = attendees.find((a: any) => a.userId === user?.id);
          const canUpload = me?.rsvp === RSVP.YES || me?.rsvp === RSVP.MAYBE;
          
          setUploadPermissions({
            canUpload,
            reason: !canUpload ? (
              !me ? 'You must RSVP to this event to upload photos' :
              'Only users who are going or might be going can upload photos'
            ) : undefined,
            rsvpStatus: me?.rsvp
          });
          
          // Sync RSVP context with server response
          if (me?.rsvp) {
            const serverRSVP = me.rsvp as RSVP;
            const contextRSVP = userRSVP(eventId);
            
            if (contextRSVP !== serverRSVP) {
              console.log('🔄 [RSVP DEBUG] Syncing RSVP context (fallback). Context:', contextRSVP, 'Server:', serverRSVP);
              setEventRSVP(eventId, serverRSVP);
            }
          }
        } else {
          setUploadPermissions({
            canUpload: false,
            reason: 'Unable to check your RSVP status'
          });
        }
      }
    } catch (error) {
      console.error('Failed to check upload permissions:', error);
      setUploadPermissions({
        canUpload: false,
        reason: 'Failed to check upload permissions'
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, user?.id, userRSVP, setEventRSVP]);

  useEffect(() => {
    checkUploadPermissions();
  }, [checkUploadPermissions]);

  const handlePhotoUploaded = (photo: EventPhoto) => {
    console.log('Photo uploaded:', photo);
    // Show success message based on RSVP status
    if (uploadPermissions.rsvpStatus === RSVP.MAYBE) {
      Alert.alert(
        'Photo Uploaded!', 
        'Your photo has been added to the event album. You can update your RSVP to "Going" anytime!',
        [{ text: 'Got it' }]
      );
    }
  };

  const handleError = (error: string) => {
    Alert.alert('Error', error);
  };

  const showPermissionInfo = () => {
    if (!uploadPermissions.reason) return;
    
    Alert.alert(
      'Photo Upload',
      uploadPermissions.reason,
      [
        { text: 'OK' },
        ...(uploadPermissions.reason.includes('RSVP') ? [{
          text: 'View Event',
          onPress: () => navigation.goBack()
        }] : [])
      ]
    );
  };

  const getStatusMessage = () => {
    if (loading) return 'Checking permissions...';
    
    if (uploadPermissions.canUpload) {
      const status = uploadPermissions.rsvpStatus;
      if (status === RSVP.YES) {
        return 'You can upload photos since you\'re going to this event';
      } else if (status === RSVP.MAYBE) {
        return 'You can upload photos even though you\'re marked as "Maybe"';
      }
      return 'You can upload photos to this event';
    }
    
    return uploadPermissions.reason || 'You cannot upload photos to this event';
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
        
        {/* Permission info button */}
        <TouchableOpacity 
          style={styles.infoButton} 
          onPress={showPermissionInfo}
        >
          <Ionicons 
            name={uploadPermissions.canUpload ? "checkmark-circle" : "information-circle"} 
            size={24} 
            color={uploadPermissions.canUpload ? "#4CAF50" : "#FFA726"} 
          />
        </TouchableOpacity>
      </View>

      {/* Status message */}
      {!loading && (
        <View style={[
          styles.statusContainer, 
          { backgroundColor: uploadPermissions.canUpload ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 167, 38, 0.1)' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: uploadPermissions.canUpload ? '#4CAF50' : '#FFA726' }
          ]}>
            {getStatusMessage()}
          </Text>
        </View>
      )}

      {/* Event Photos Gallery */}
      <EventPhotosGallery
        eventId={eventId}
        canUpload={uploadPermissions.canUpload}
        onPhotoUploaded={handlePhotoUploaded}
        onError={handleError}
        uploadPermissions={uploadPermissions}
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
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContainer: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default EventPhotosScreen; 