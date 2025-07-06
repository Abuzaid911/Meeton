import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';
import APIService from '../../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import ImageUploader from '../../components/common/ImageUploader';
import { ImageType } from '../../services/imageService';
import { Event } from '../../types';

const { width } = Dimensions.get('window');

interface EventForm {
  name: string;
  description: string;
  type: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  image: string | null;
  color: string;
  backgroundType: 'color' | 'image';
  date: string;
  time: string;
  location: string;
  locationDisplayName: string;
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
  invitedFriends: string[];
  maxGuests: string;
}

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

type RouteParams = {
  eventId: string;
};

const eventTypes = [
  { id: 'birthday', name: 'Birthday', icon: 'gift', color: Colors.systemRed },
  { id: 'party', name: 'Party', icon: 'musical-notes', color: Colors.systemPurple },
  { id: 'networking', name: 'Networking', icon: 'people', color: Colors.primary },
  { id: 'sports', name: 'Sports', icon: 'fitness', color: Colors.systemGreen },
  { id: 'food', name: 'Food', icon: 'restaurant', color: Colors.systemOrange },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', color: Colors.gray },
];

const colorOptions = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];

// Component definitions outside main component to prevent re-creation
const GlassButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: string;
  disabled?: boolean;
}> = ({ title, onPress, variant = 'primary', icon, disabled = false }) => (
  <TouchableOpacity 
    style={[styles.glassButton, disabled && styles.glassButtonDisabled]} 
    onPress={onPress}
    disabled={disabled}
    activeOpacity={1}
  >
    <BlurView intensity={100} style={styles.glassButtonBlur}>
      <View style={[
        styles.glassButtonContent,
        variant === 'primary' ? styles.glassButtonPrimary : styles.glassButtonSecondary,
        disabled && styles.glassButtonContentDisabled
      ]}>
        <Text style={[
          styles.glassButtonText,
          variant === 'secondary' && styles.glassButtonSecondaryText,
          disabled && styles.glassButtonTextDisabled
        ]}>
          {title}
        </Text>
        {icon && (
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={disabled ? 'rgba(255, 255, 255, 0.3)' : (variant === 'primary' ? Colors.white : 'rgba(255, 255, 255, 0.8)')} 
          />
        )}
      </View>
    </BlurView>
  </TouchableOpacity>
);

const InputField: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  icon?: string;
  numeric?: boolean;
}> = ({ label, value, onChangeText, placeholder, multiline = false, icon, numeric = false }) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputLabelContainer}>
      {icon && <Ionicons name={icon as any} size={16} color="rgba(255, 255, 255, 0.8)" />}
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
    <BlurView intensity={80} style={styles.inputBlur}>
      <TextInput
        style={[styles.textInput, multiline && styles.textInputMultiline]}
        value={value}
        onChangeText={numeric ? (text) => onChangeText(text.replace(/[^0-9]/g, '')) : onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={numeric ? 'numeric' : 'default'}
      />
    </BlurView>
  </View>
);

const DateTimePicker: React.FC<{
  label: string;
  value: string;
  onPress: () => void;
  placeholder: string;
  icon?: string;
}> = ({ label, value, onPress, placeholder, icon }) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputLabelContainer}>
      {icon && <Ionicons name={icon as any} size={16} color="rgba(255, 255, 255, 0.8)" />}
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
    <TouchableOpacity onPress={onPress}>
      <BlurView intensity={80} style={styles.inputBlur}>
        <View style={[styles.textInput, styles.pickerInput]}>
          <Text style={[
            styles.pickerText,
            !value && styles.pickerPlaceholder
          ]}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="rgba(255, 255, 255, 0.6)" />
        </View>
      </BlurView>
    </TouchableOpacity>
  </View>
);

const EditEventScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { eventId } = route.params as RouteParams;
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLocationNameModal, setShowLocationNameModal] = useState(false);
  const [selectedLocationForNaming, setSelectedLocationForNaming] = useState<LocationSuggestion | null>(null);
  
  const [form, setForm] = useState<EventForm>({
    name: '',
    description: '',
    type: '',
    privacy: 'PRIVATE',
    image: null,
    color: colorOptions[0],
    backgroundType: 'color',
    date: '',
    time: '',
    location: '',
    locationDisplayName: '',
    coordinates: null,
    invitedFriends: [],
    maxGuests: '',
  });

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const eventData = await APIService.getEventById(eventId);
      if (eventData) {
        setEvent(eventData);
        
        // Pre-populate form with existing event data
        const eventDate = new Date(eventData.date);
        const year = eventDate.getFullYear();
        const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
        const day = eventDate.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        setForm({
          name: eventData.name || '',
          description: eventData.description || '',
          type: eventData.category || '',
          privacy: eventData.privacyLevel === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
          image: eventData.headerImageUrl || null,
          color: eventData.headerColor || colorOptions[0],
          backgroundType: eventData.headerType === 'image' ? 'image' : 'color',
          date: formattedDate,
          time: eventData.time || '',
          location: eventData.location || '',
          locationDisplayName: eventData.location || '',
          coordinates: eventData.lat && eventData.lng ? {
            latitude: eventData.lat,
            longitude: eventData.lng
          } : null,
          invitedFriends: [],
          maxGuests: eventData.capacity ? eventData.capacity.toString() : '',
        });
        
        setLocationQuery(eventData.location || '');
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      Alert.alert('Error', 'Failed to load event data. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof EventForm, value: string | boolean | null | string[] | { latitude: number; longitude: number }) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return form.name.trim() !== '' && form.type !== '';
      case 2:
        return form.date.trim() !== '' && form.time.trim() !== '' && form.location.trim() !== '';
      case 3:
        return true; // Optional step
      case 4:
        return true; // Summary step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdateEvent = async () => {
    try {
      setIsUpdating(true);
      
      // Validate required fields
      if (!form.name || !form.date || !form.time || !form.location) {
        Alert.alert('Missing Information', 'Please fill in all required fields (Event Name, Date, Time, and Location).');
        setIsUpdating(false);
        return;
      }

      // Parse the time string (e.g., "10:30 AM" or "2:15 PM")
      const timeMatch = form.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        Alert.alert('Invalid Time Format', 'Please select a valid time.');
        setIsUpdating(false);
        return;
      }

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();

      // Convert to 24-hour format
      if (ampm === 'PM' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }

      // Create the date object with the parsed date and time
      const eventDateTime = new Date(form.date);
      eventDateTime.setHours(hours, minutes, 0, 0);
      
      // Validate that the combined date is valid
      if (isNaN(eventDateTime.getTime())) {
        Alert.alert('Invalid Date/Time', 'Please select a valid date and time.');
        setIsUpdating(false);
        return;
      }

      // Update the event
      const updatedEvent = await APIService.updateEvent(eventId, {
        name: form.name,
        description: form.description || form.name,
        date: eventDateTime.toISOString(),
        time: form.time,
        location: form.locationDisplayName || form.location,
        lat: form.coordinates?.latitude,
        lng: form.coordinates?.longitude,
        category: form.type || 'Other',
        privacyLevel: form.privacy === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
        headerType: form.backgroundType === 'image' ? 'image' : 'color',
        headerColor: form.color,
        headerImageUrl: form.image || undefined,
        capacity: form.maxGuests ? parseInt(form.maxGuests) : undefined,
        tags: form.type ? [form.type] : [],
      });

      setIsUpdating(false);
      
      if (updatedEvent) {
        Alert.alert('Success', 'Event updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('EventDetails', { eventId }),
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update event. Please try again.');
      }
      
    } catch (error) {
      setIsUpdating(false);
      Alert.alert('Error', 'Failed to update event. Please try again.');
      console.error('Error updating event:', error);
    }
  };

  const handleImageUpload = (cloudinaryUrl: string) => {
    updateForm('image', cloudinaryUrl);
  };

  const handleImageRemove = () => {
    updateForm('image', null);
  };

  // Mock location suggestions - in a real app, you'd use Google Places API or similar
  const mockLocationSuggestions: LocationSuggestion[] = [
    { id: '1', name: 'Central Park', address: 'New York, NY 10024, USA', latitude: 40.7829, longitude: -73.9654 },
    { id: '2', name: 'Golden Gate Park', address: 'San Francisco, CA, USA', latitude: 37.7694, longitude: -122.4862 },
    { id: '3', name: 'Millennium Park', address: 'Chicago, IL 60601, USA', latitude: 41.8826, longitude: -87.6226 },
    { id: '4', name: 'Bryant Park', address: 'New York, NY 10018, USA', latitude: 40.7536, longitude: -73.9832 },
    { id: '5', name: 'Dolores Park', address: 'San Francisco, CA 94114, USA', latitude: 37.7596, longitude: -122.4269 },
    { id: '6', name: 'Grant Park', address: 'Chicago, IL 60605, USA', latitude: 41.8755, longitude: -87.6244 },
    { id: '7', name: 'Balboa Park', address: 'San Diego, CA, USA', latitude: 32.7341, longitude: -117.1449 },
    { id: '8', name: 'Lincoln Park', address: 'Chicago, IL, USA', latitude: 41.9278, longitude: -87.6394 },
  ];

  const searchLocations = (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    const filtered = mockLocationSuggestions.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase()) ||
      location.address.toLowerCase().includes(query.toLowerCase())
    );
    
    setLocationSuggestions(filtered);
    setShowLocationSuggestions(filtered.length > 0);
  };

  const handleLocationInputChange = (text: string) => {
    setLocationQuery(text);
    updateForm('location', text);
    searchLocations(text);
  };

  const selectLocation = (location: LocationSuggestion) => {
    setSelectedLocationForNaming(location);
    setShowLocationNameModal(true);
    setShowLocationSuggestions(false);
  };

  const confirmLocationWithName = (customName?: string) => {
    if (selectedLocationForNaming) {
      const displayName = customName?.trim() || selectedLocationForNaming.name;
      updateForm('location', selectedLocationForNaming.address);
      updateForm('locationDisplayName', displayName);
      updateForm('coordinates', { 
        latitude: selectedLocationForNaming.latitude, 
        longitude: selectedLocationForNaming.longitude 
      });
      setLocationQuery(displayName);
    }
    setShowLocationNameModal(false);
    setSelectedLocationForNaming(null);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need location permissions to get your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      updateForm('coordinates', { latitude, longitude });
      updateForm('location', `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      setLocationQuery(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
    } catch (error) {
      Alert.alert('Error', 'Could not get your current location. Please try again.');
    }
  };

  const openMapPicker = () => {
    setShowMapPicker(true);
  };

  const handleMapLocationSelect = (coordinate: { latitude: number; longitude: number }) => {
    updateForm('coordinates', coordinate);
    const locationName = `Selected Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
    updateForm('location', locationName);
    setLocationQuery(locationName);
  };

  const handleDateSelection = (date: Date) => {
    // Store date in YYYY-MM-DD format using local timezone to avoid date shift issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    updateForm('date', formattedDate);
    setShowDatePicker(false);
  };

  const handleTimeSelection = (time: Date) => {
    const formattedTime = time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    updateForm('time', formattedTime);
    setShowTimePicker(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading event...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Include the same CustomDatePicker, CustomTimePicker, LocationInput, MapPickerModal, and other components from CreateEventScreen
  // ... (These would be identical to the CreateEventScreen implementations)

  // Render methods for each step (similar to CreateEventScreen but with "Update" instead of "Create")
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Edit Event Details</Text>
      <Text style={styles.stepDescription}>Update your event information</Text>
      
      <InputField
        label="Event Name"
        value={form.name}
        onChangeText={(text) => updateForm('name', text)}
        placeholder="What's the event called?"
        icon="text"
      />
      
      <InputField
        label="Description"
        value={form.description}
        onChangeText={(text) => updateForm('description', text)}
        placeholder="Tell people about your event..."
        multiline
        icon="document-text"
      />
      
      <View style={styles.inputContainer}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="apps" size={16} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.inputLabel}>Event Type</Text>
        </View>
        <View style={styles.eventTypeGrid}>
          {eventTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.eventTypeButton,
                form.type === type.id && styles.eventTypeButtonActive
              ]}
              onPress={() => updateForm('type', type.id)}
            >
              <BlurView intensity={80} style={styles.eventTypeBlur}>
                <View style={[
                  styles.eventTypeContent,
                  form.type === type.id && { backgroundColor: type.color }
                ]}>
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={form.type === type.id ? Colors.white : type.color} 
                  />
                  <Text style={[
                    styles.eventTypeText,
                    form.type === type.id && styles.eventTypeTextActive
                  ]}>
                    {type.name}
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When & Where</Text>
      <Text style={styles.stepDescription}>Set the date, time, and location</Text>
      
      <DateTimePicker
        label="Date"
        value={form.date ? new Date(form.date).toLocaleDateString() : ''}
        onPress={() => setShowDatePicker(true)}
        placeholder="Select date"
        icon="calendar"
      />
      
      <DateTimePicker
        label="Time"
        value={form.time}
        onPress={() => setShowTimePicker(true)}
        placeholder="Select time"
        icon="time"
      />
      
      {/* Location Input Component would go here */}
      <InputField
        label="Location"
        value={locationQuery}
        onChangeText={handleLocationInputChange}
        placeholder="Where is your event?"
        icon="location"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Customize</Text>
      <Text style={styles.stepDescription}>Make your event stand out</Text>
      
      <View style={styles.inputContainer}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="image" size={16} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.inputLabel}>Event Image</Text>
        </View>
        <ImageUploader
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
          currentImage={form.image}
          imageType={ImageType.EVENT_HEADER}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="color-palette" size={16} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.inputLabel}>Background Color</Text>
        </View>
        <View style={styles.colorGrid}>
          {colorOptions.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                form.color === color && styles.colorOptionActive
              ]}
              onPress={() => updateForm('color', color)}
            >
              {form.color === color && (
                <Ionicons name="checkmark" size={20} color={Colors.white} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <InputField
        label="Max Guests (Optional)"
        value={form.maxGuests}
        onChangeText={(text) => updateForm('maxGuests', text)}
        placeholder="Unlimited"
        icon="people"
        numeric
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review Changes</Text>
      <Text style={styles.stepDescription}>Make sure everything looks good</Text>
      
      {/* Event preview card would go here */}
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>{form.name}</Text>
        <Text style={styles.previewDetails}>
          {form.date ? new Date(form.date).toLocaleDateString() : 'No date'} • {form.time || 'No time'}
        </Text>
        <Text style={styles.previewLocation}>{form.locationDisplayName || form.location}</Text>
      </View>
      
      <GlassButton
        title={isUpdating ? "Updating..." : "Update Event"}
        onPress={handleUpdateEvent}
        disabled={isUpdating}
        icon="checkmark"
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Event</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderCurrentStep()}
        </ScrollView>
        
        <View style={styles.footer}>
          <View style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  currentStep >= step && styles.stepDotActive
                ]}
              />
            ))}
          </View>
          
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <GlassButton
                title="Back"
                onPress={handleBack}
                variant="secondary"
                icon="chevron-back"
              />
            )}
            
            {currentStep < 4 && (
              <GlassButton
                title="Next"
                onPress={handleNext}
                disabled={!isStepValid()}
                icon="chevron-forward"
              />
            )}
          </View>
        </View>
      </SafeAreaView>
      
      {/* Date/Time Picker Modals would go here */}
    </View>
  );
};

// Styles (same as CreateEventScreen)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.white,
    fontSize: FontSize.large,
    fontWeight: FontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.large,
    paddingVertical: Spacing.medium,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.large,
    fontWeight: FontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: Spacing.large,
  },
  stepTitle: {
    color: Colors.white,
    fontSize: FontSize.extraLarge,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.small,
  },
  stepDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.medium,
    marginBottom: Spacing.extraLarge,
  },
  inputContainer: {
    marginBottom: Spacing.large,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.medium,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.small,
  },
  inputBlur: {
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
  },
  textInput: {
    padding: Spacing.medium,
    color: Colors.white,
    fontSize: FontSize.medium,
    minHeight: 50,
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    color: Colors.white,
    fontSize: FontSize.medium,
  },
  pickerPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  eventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventTypeButton: {
    width: '48%',
    marginBottom: Spacing.medium,
  },
  eventTypeBlur: {
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
  },
  eventTypeContent: {
    padding: Spacing.medium,
    alignItems: 'center',
    borderRadius: BorderRadius.medium,
  },
  eventTypeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.small,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.small,
  },
  eventTypeTextActive: {
    color: Colors.white,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: Spacing.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionActive: {
    borderWidth: 2,
    borderColor: Colors.white,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.medium,
    padding: Spacing.large,
    marginBottom: Spacing.large,
  },
  previewTitle: {
    color: Colors.white,
    fontSize: FontSize.large,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.small,
  },
  previewDetails: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.medium,
    marginBottom: Spacing.small,
  },
  previewLocation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FontSize.medium,
  },
  footer: {
    padding: Spacing.large,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.large,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.white,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glassButton: {
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    flex: 1,
    marginHorizontal: Spacing.small,
  },
  glassButtonDisabled: {
    opacity: 0.5,
  },
  glassButtonBlur: {
    borderRadius: BorderRadius.medium,
  },
  glassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.medium,
    borderRadius: BorderRadius.medium,
  },
  glassButtonPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassButtonContentDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  glassButtonText: {
    color: Colors.white,
    fontSize: FontSize.medium,
    fontWeight: FontWeight.semibold,
    marginRight: Spacing.small,
  },
  glassButtonSecondaryText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  glassButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
});

export default EditEventScreen; 