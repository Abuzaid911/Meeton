import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors, Spacing, FontSize, FontWeight } from '../../constants';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { EventPhoto, RSVP } from '../../types';
import APIService from '../../services/api';

const EventPhotosScreen: React.FC = () => {
  const route = useRoute<any>();
  const { user } = useAuth();
  const eventId = route.params?.eventId;
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isGoing, setIsGoing] = useState(false);

  // Fetch event photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await APIService.getEventPhotos(eventId);
      setPhotos(res || []);
    } catch (e) {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Check if user is going
  const checkIsGoing = useCallback(async () => {
    try {
      const attendees = await APIService.getEventAttendees(eventId);
      const me = attendees?.find((a: any) => a.userId === user?.id);
      setIsGoing(me?.rsvp === RSVP.YES);
    } catch {
      setIsGoing(false);
    }
  }, [eventId, user?.id]);

  useEffect(() => {
    fetchPhotos();
    checkIsGoing();
  }, [fetchPhotos, checkIsGoing]);

  // Upload photo handler
  const handleUploadPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      setUploading(true);
      // For demo: just use the local uri as imageUrl (in production, upload to S3/Cloudinary and use the returned URL)
      const imageUrl = result.assets[0].uri;
      const res = await APIService.uploadEventPhoto(eventId, imageUrl);
      if (res) {
        Alert.alert('Success', 'Photo uploaded!');
        fetchPhotos();
      } else {
        Alert.alert('Error', 'Failed to upload photo.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const renderPhoto = ({ item }: { item: EventPhoto }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.imageUrl }} style={styles.photoImage} />
      <View style={styles.photoMeta}>
        <Image source={{ uri: item.user?.image || undefined }} style={styles.avatar} />
        <Text style={styles.username}>{item.user?.username}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Photos</Text>
        {isGoing && (
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadPhoto} disabled={uploading}>
            <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Upload Photo'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet. {isGoing ? 'Be the first to upload!' : ''}</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={item => item.id}
          renderItem={renderPhoto}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSize.largeTitle,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  photoGrid: {
    padding: Spacing.md,
  },
  photoItem: {
    flex: 1,
    margin: 4,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.gray,
  },
  photoImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'cover',
  },
  photoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  username: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.gray,
    fontSize: 16,
    marginTop: 40,
  },
});

export default EventPhotosScreen; 