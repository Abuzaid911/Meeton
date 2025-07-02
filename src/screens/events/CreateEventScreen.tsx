import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';

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

const mockFriends = [
  { id: '1', name: 'Sarah Johnson', image: 'https://images.unsplash.com/photo-1494790108755-2616b60c8f57?w=150' },
  { id: '2', name: 'Michael Chen', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: '3', name: 'Emily Rodriguez', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
  { id: '4', name: 'David Kim', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
  { id: '5', name: 'Jessica Williams', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { id: '6', name: 'Marcus Thompson', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
  { id: '7', name: 'Lisa Park', image: 'https://images.unsplash.com/photo-1494790108755-2616b60c8f57?w=150' },
  { id: '8', name: 'Alex Rivera', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
  { id: '9', name: 'Nina Patel', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
  { id: '10', name: 'Jordan Brooks', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
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

const CreateEventScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
      case 5:
        return true; // Final step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setIsCreating(true);
      
      // Validate required fields
      if (!form.name || !form.date || !form.time || !form.location) {
        Alert.alert('Missing Information', 'Please fill in all required fields (Event Name, Date, Time, and Location).');
        setIsCreating(false);
        return;
      }

      // Parse the time string (e.g., "10:30 AM" or "2:15 PM")
      const timeMatch = form.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!timeMatch) {
        Alert.alert('Invalid Time Format', 'Please select a valid time.');
        setIsCreating(false);
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
      
      // Validate that the combined date is valid and in the future
      if (isNaN(eventDateTime.getTime())) {
        Alert.alert('Invalid Date/Time', 'Please select a valid date and time.');
        setIsCreating(false);
        return;
      }
      
      if (eventDateTime <= new Date()) {
        Alert.alert('Invalid Date', 'Event date must be in the future.');
        setIsCreating(false);
        return;
      }

      // Create the event
      const newEvent = await APIService.createEvent({
        name: form.name,
        description: form.description || form.name,
        date: eventDateTime.toISOString(), // Convert to ISO string for backend
        time: form.time,
        location: form.locationDisplayName || form.location,
        lat: form.coordinates?.latitude,
        lng: form.coordinates?.longitude,
        category: form.type || 'Other',
        privacyLevel: form.privacy === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
        headerType: form.backgroundType === 'image' ? 'image' : 'color',
        headerColor: form.color,
        headerImageUrl: form.image || undefined,
        duration: 180, // Default 3 hours in minutes
        capacity: form.maxGuests ? parseInt(form.maxGuests) : undefined,
        tags: form.type ? [form.type] : [],
      });

      setIsCreating(false);
      
      if (newEvent) {
        // Show success message and navigate to home screen
        Alert.alert('Event Created!', 'Your event has been created successfully.', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to the home tab to see the new event
              navigation.navigate('Home');
            }
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to create event. Please try again.');
      }
      
    } catch (error) {
      setIsCreating(false);
      Alert.alert('Error', 'Failed to create event. Please try again.');
      console.error('Error creating event:', error);
    }
  };

  const handleShareEvent = () => {
    Alert.alert('Share Event', 'Event link copied to clipboard!');
  };

  const pickImage = async () => {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to select images.');
      return;
    }

    // Show action sheet to choose between camera and gallery
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateForm('image', result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateForm('image', result.assets[0].uri);
    }
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
      updateForm('location', selectedLocationForNaming.address); // Store actual address
      updateForm('locationDisplayName', displayName); // Store custom name for display
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
      
      // In a real app, you'd reverse geocode to get the address
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
    // In a real app, you'd reverse geocode to get the address
    const locationName = `Selected Location (${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)})`;
    updateForm('location', locationName);
    setLocationQuery(locationName);
    // Don't auto-close - let user confirm the selection
  };

  const handleDateSelection = (date: Date) => {
    // Store date in YYYY-MM-DD format for easier combination with time
    const formattedDate = date.toISOString().split('T')[0];
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

  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );



  const CustomDatePicker: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    title: string;
  }> = ({ visible, onClose, onSelect, title }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      
      // Add all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      
      return days;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const isPastDate = (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    };

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} style={styles.modalBlur}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.pickerContainer}>
                {/* Month Navigation */}
                <View style={styles.monthNavigation}>
                  <TouchableOpacity 
                    style={styles.monthNavButton}
                    onPress={() => navigateMonth('prev')}
                  >
                    <Ionicons name="chevron-back" size={24} color={Colors.white} />
                  </TouchableOpacity>
                  
                  <Text style={styles.monthYearText}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.monthNavButton}
                    onPress={() => navigateMonth('next')}
                  >
                    <Ionicons name="chevron-forward" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                {/* Day Headers */}
                <View style={styles.dayHeaders}>
                  {dayNames.map((day) => (
                    <Text key={day} style={styles.dayHeaderText}>{day}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {getDaysInMonth(currentDate).map((date, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !date && styles.calendarDayEmpty,
                        date && isToday(date) && styles.calendarDayToday,
                        date && isPastDate(date) && styles.calendarDayPast
                      ]}
                      onPress={() => date && !isPastDate(date) && onSelect(date)}
                      disabled={!date || isPastDate(date)}
                    >
                      {date && (
                        <Text style={[
                          styles.calendarDayText,
                          isToday(date) && styles.calendarDayTextToday,
                          isPastDate(date) && styles.calendarDayTextPast
                        ]}>
                          {date.getDate()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Select */}
                <View style={styles.quickSelectContainer}>
                  <Text style={styles.quickSelectTitle}>Quick Select:</Text>
                  <View style={styles.quickSelectButtons}>
                    <TouchableOpacity 
                      style={styles.quickSelectButton}
                      onPress={() => onSelect(new Date())}
                    >
                      <Text style={styles.quickSelectButtonText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickSelectButton}
                      onPress={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        onSelect(tomorrow);
                      }}
                    >
                      <Text style={styles.quickSelectButtonText}>Tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.quickSelectButton}
                      onPress={() => {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        onSelect(nextWeek);
                      }}
                    >
                      <Text style={styles.quickSelectButtonText}>Next Week</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    );
  };

  const CustomTimePicker: React.FC<{
    visible: boolean;
    onClose: () => void;
    onSelect: (time: Date) => void;
  }> = ({ visible, onClose, onSelect }) => {
    const [selectedHour, setSelectedHour] = useState(12);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i); // 0, 1, 2, 3... 59

    const handleConfirm = () => {
      const date = new Date();
      const hour24 = selectedPeriod === 'PM' && selectedHour !== 12 ? selectedHour + 12 : 
                   selectedHour === 12 && selectedPeriod === 'AM' ? 0 : selectedHour;
      date.setHours(hour24);
      date.setMinutes(selectedMinute);
      onSelect(date);
    };

    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} style={styles.modalBlur}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={Colors.white} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerHelperText}>
                  Choose any time for your event
                </Text>
                
                {/* Time Display */}
                <View style={styles.timeDisplayContainer}>
                  <BlurView intensity={60} style={styles.timeDisplayBlur}>
                    <View style={styles.timeDisplayContent}>
                      <Text style={styles.timeDisplayText}>
                        {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                      </Text>
                    </View>
                  </BlurView>
                </View>

                {/* Time Picker Wheels */}
                <View style={styles.timeWheelContainer}>
                  {/* Hour Picker */}
                  <View style={styles.wheelColumn}>
                    <Text style={styles.wheelLabel}>Hour</Text>
                    <ScrollView style={styles.wheel} showsVerticalScrollIndicator={false}>
                      {hours.map((hour) => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.wheelItem,
                            selectedHour === hour && styles.wheelItemSelected
                          ]}
                          onPress={() => setSelectedHour(hour)}
                        >
                          <Text style={[
                            styles.wheelItemText,
                            selectedHour === hour && styles.wheelItemTextSelected
                          ]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Minute Picker */}
                  <View style={styles.wheelColumn}>
                    <Text style={styles.wheelLabel}>Min</Text>
                    <ScrollView style={styles.wheel} showsVerticalScrollIndicator={false}>
                      {minutes.map((minute) => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.wheelItem,
                            selectedMinute === minute && styles.wheelItemSelected
                          ]}
                          onPress={() => setSelectedMinute(minute)}
                        >
                          <Text style={[
                            styles.wheelItemText,
                            selectedMinute === minute && styles.wheelItemTextSelected
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* AM/PM Picker */}
                  <View style={styles.wheelColumn}>
                    <Text style={styles.wheelLabel}>Period</Text>
                    <View style={styles.periodContainer}>
                      {['AM', 'PM'].map((period) => (
                        <TouchableOpacity
                          key={period}
                          style={[
                            styles.periodButton,
                            selectedPeriod === period && styles.periodButtonSelected
                          ]}
                          onPress={() => setSelectedPeriod(period as 'AM' | 'PM')}
                        >
                          <Text style={[
                            styles.periodButtonText,
                            selectedPeriod === period && styles.periodButtonTextSelected
                          ]}>
                            {period}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity style={styles.confirmTimeButton} onPress={handleConfirm}>
                  <BlurView intensity={80} style={styles.confirmTimeBlur}>
                    <View style={styles.confirmTimeContent}>
                      <Text style={styles.confirmTimeText}>Confirm Time</Text>
                      <Ionicons name="checkmark" size={20} color={Colors.white} />
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    );
  };

  // Location Input with Suggestions Component
  const LocationInput: React.FC = () => (
    <View style={styles.inputContainer}>
      <View style={styles.inputLabelContainer}>
        <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
        <Text style={styles.inputLabel}>Location</Text>
      </View>
      
      <BlurView intensity={80} style={styles.inputBlur}>
        <TextInput
          style={styles.textInput}
          value={locationQuery}
          onChangeText={handleLocationInputChange}
          placeholder="Where is it happening?"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          onFocus={() => {
            if (locationSuggestions.length > 0) {
              setShowLocationSuggestions(true);
            }
          }}
        />
      </BlurView>

      {/* Quick Location Actions */}
      <View style={styles.locationActions}>
        <TouchableOpacity style={styles.locationActionButton} onPress={getCurrentLocation}>
          <BlurView intensity={60} style={styles.locationActionBlur}>
            <View style={styles.locationActionContent}>
              <Ionicons name="navigate" size={16} color={Colors.primary} />
              <Text style={styles.locationActionText}>Current Location</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.locationActionButton} onPress={openMapPicker}>
          <BlurView intensity={60} style={styles.locationActionBlur}>
            <View style={styles.locationActionContent}>
              <Ionicons name="map" size={16} color={Colors.primary} />
              <Text style={styles.locationActionText}>Choose on Map</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Location Suggestions */}
      {showLocationSuggestions && locationSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <BlurView intensity={80} style={styles.suggestionsBlur}>
            <View style={styles.suggestionsContent}>
              {locationSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(suggestion)}
                >
                  <View style={styles.suggestionContent}>
                    <Ionicons name="location" size={16} color={Colors.primary} />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionName}>{suggestion.name}</Text>
                      <Text style={styles.suggestionAddress}>{suggestion.address}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );

  // Map Picker Modal Component
  const MapPickerModal: React.FC = () => (
    <Modal 
      visible={showMapPicker} 
      animationType="slide" 
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.mapModalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose Location</Text>
          <TouchableOpacity onPress={() => setShowMapPicker(false)}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Map */}
        <MapView
          style={styles.fullMap}
          initialRegion={{
            latitude: form.coordinates?.latitude || 37.7749,
            longitude: form.coordinates?.longitude || -122.4194,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          onPress={(event) => {
            const coordinate = event.nativeEvent.coordinate;
            console.log('Map tapped at:', coordinate);
            handleMapLocationSelect(coordinate);
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {form.coordinates && (
            <Marker
              coordinate={form.coordinates}
              title="Event Location"
              description="Selected location"
              pinColor={Colors.primary}
            />
          )}
        </MapView>
        
        {/* Instructions */}
        <View style={styles.mapInstructions}>
          <Text style={styles.mapInstructionsText}>
            📍 Tap anywhere on the map to select the event location
          </Text>
          {form.coordinates && (
            <TouchableOpacity 
              style={styles.confirmLocationButton}
              onPress={() => setShowMapPicker(false)}
            >
              <View style={styles.confirmLocationContent}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
                <Text style={styles.confirmLocationText}>Confirm Location</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const StepIndicator: React.FC = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((step) => (
        <View key={step} style={styles.stepIndicatorContainer}>
          <View style={[
            styles.stepDot,
            currentStep >= step && styles.stepDotActive
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={12} color={Colors.white} />
            ) : (
              <Text style={styles.stepNumber}>{step}</Text>
            )}
          </View>
          {step < 5 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  // Step 1: Event Name, Type, Image/Color
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Event Basics</Text>
        <Text style={styles.stepSubtitle}>What's your event about?</Text>
      </View>

      <View style={styles.formSection}>
        <InputField
          label="Event Name"
          value={form.name}
          onChangeText={(text) => updateForm('name', text)}
          placeholder="What's the occasion?"
          icon="star-outline"
        />

        <InputField
          label="Description (Optional)"
          value={form.description}
          onChangeText={(text) => updateForm('description', text)}
          placeholder="Tell people more about your event..."
          icon="document-text-outline"
          multiline={true}
        />

        {/* Privacy Selection */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name="lock-closed" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.inputLabel}>Event Privacy</Text>
          </View>
          
          <View style={styles.privacyToggleContainer}>
            <TouchableOpacity
              style={[
                styles.privacyToggleButton,
                form.privacy === 'PUBLIC' && styles.privacyToggleButtonActive
              ]}
              onPress={() => updateForm('privacy', 'PUBLIC')}
            >
              <BlurView intensity={80} style={styles.privacyToggleBlur}>
                <View style={[
                  styles.privacyToggleContent,
                  form.privacy === 'PUBLIC' && styles.privacyToggleContentActive
                ]}>
                  <Ionicons 
                    name="globe" 
                    size={18} 
                    color={form.privacy === 'PUBLIC' ? Colors.white : 'rgba(255, 255, 255, 0.6)'} 
                  />
                  <View style={styles.privacyToggleTextContainer}>
                    <Text style={[
                      styles.privacyToggleTitle,
                      form.privacy === 'PUBLIC' && styles.privacyToggleTitleActive
                    ]}>
                      Public
                    </Text>
                    <Text style={[
                      styles.privacyToggleSubtitle,
                      form.privacy === 'PUBLIC' && styles.privacyToggleSubtitleActive
                    ]}>
                      Appears for everyone on the app
                    </Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.privacyToggleButton,
                form.privacy === 'PRIVATE' && styles.privacyToggleButtonActive
              ]}
              onPress={() => updateForm('privacy', 'PRIVATE')}
            >
              <BlurView intensity={80} style={styles.privacyToggleBlur}>
                <View style={[
                  styles.privacyToggleContent,
                  form.privacy === 'PRIVATE' && styles.privacyToggleContentActive
                ]}>
                  <Ionicons 
                    name="lock-closed" 
                    size={18} 
                    color={form.privacy === 'PRIVATE' ? Colors.white : 'rgba(255, 255, 255, 0.6)'} 
                  />
                  <View style={styles.privacyToggleTextContainer}>
                    <Text style={[
                      styles.privacyToggleTitle,
                      form.privacy === 'PRIVATE' && styles.privacyToggleTitleActive
                    ]}>
                      Private
                    </Text>
                    <Text style={[
                      styles.privacyToggleSubtitle,
                      form.privacy === 'PRIVATE' && styles.privacyToggleSubtitleActive
                    ]}>
                      For friends only, or people invited only
                    </Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Type Selection */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name="grid" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.inputLabel}>Event Type</Text>
          </View>
          <View style={styles.typeGrid}>
            {eventTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeItem,
                  form.type === type.id && styles.typeItemSelected
                ]}
                onPress={() => updateForm('type', type.id)}
              >
                <BlurView intensity={80} style={styles.typeBlur}>
                  <View style={[
                    styles.typeContent,
                    form.type === type.id && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  ]}>
                    <View style={[styles.typeIcon, { backgroundColor: type.color }]}>
                      <Ionicons name={type.icon as any} size={18} color={Colors.white} />
                    </View>
                    <Text style={styles.typeName}>{type.name}</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Background Selection Toggle */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name="image" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.inputLabel}>Event Background</Text>
          </View>
          
          {/* Toggle between Color and Image */}
          <View style={styles.backgroundToggleContainer}>
            <TouchableOpacity
              style={[
                styles.backgroundToggleButton,
                form.backgroundType === 'color' && styles.backgroundToggleButtonActive
              ]}
              onPress={() => updateForm('backgroundType', 'color')}
            >
              <BlurView intensity={80} style={styles.backgroundToggleBlur}>
                <View style={[
                  styles.backgroundToggleContent,
                  form.backgroundType === 'color' && styles.backgroundToggleContentActive
                ]}>
                  <Ionicons 
                    name="color-palette" 
                    size={18} 
                    color={form.backgroundType === 'color' ? Colors.white : 'rgba(255, 255, 255, 0.6)'} 
                  />
                  <Text style={[
                    styles.backgroundToggleText,
                    form.backgroundType === 'color' && styles.backgroundToggleTextActive
                  ]}>
                    Color
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.backgroundToggleButton,
                form.backgroundType === 'image' && styles.backgroundToggleButtonActive
              ]}
              onPress={() => updateForm('backgroundType', 'image')}
            >
              <BlurView intensity={80} style={styles.backgroundToggleBlur}>
                <View style={[
                  styles.backgroundToggleContent,
                  form.backgroundType === 'image' && styles.backgroundToggleContentActive
                ]}>
                  <Ionicons 
                    name="image" 
                    size={18} 
                    color={form.backgroundType === 'image' ? Colors.white : 'rgba(255, 255, 255, 0.6)'} 
                  />
                  <Text style={[
                    styles.backgroundToggleText,
                    form.backgroundType === 'image' && styles.backgroundToggleTextActive
                  ]}>
                    Image
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Color Selection */}
          {form.backgroundType === 'color' && (
            <View style={styles.colorGrid}>
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorItem,
                    form.color === color && styles.colorItemSelected
                  ]}
                  onPress={() => updateForm('color', color)}
                >
                  <View style={[styles.colorCircle, { backgroundColor: color }]} />
                  {form.color === color && (
                    <Ionicons name="checkmark" size={16} color={Colors.white} style={styles.colorCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Image Selection */}
          {form.backgroundType === 'image' && (
            <TouchableOpacity 
              style={styles.imageSelector} 
              onPress={pickImage}
            >
              <BlurView intensity={80} style={styles.imageSelectorBlur}>
                <View style={styles.imageSelectorContent}>
                  {form.image ? (
                    <View style={styles.selectedImageContainer}>
                      <Image source={{ uri: form.image }} style={styles.selectedImage} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => updateForm('image', null)}
                      >
                        <Ionicons name="close-circle" size={24} color="rgba(255, 255, 255, 0.9)" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={32} color="rgba(255, 255, 255, 0.6)" />
                      </View>
                      <Text style={styles.imageSelectorText}>Tap to add photo</Text>
                      <Text style={styles.imageSelectorSubtext}>Choose from camera or gallery</Text>
                    </>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Step 2: Date, Time, Location
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>When & Where</Text>
        <Text style={styles.stepSubtitle}>Set the time and place</Text>
      </View>

      <View style={styles.formSection}>
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeItem}>
            <DateTimePicker
              label="Date"
              value={form.date}
              onPress={() => setShowDatePicker(true)}
              placeholder="MM/DD/YYYY"
              icon="calendar-outline"
            />
          </View>
          <View style={styles.dateTimeItem}>
            <DateTimePicker
              label="Time"
              value={form.time}
              onPress={() => setShowTimePicker(true)}
              placeholder="12:00 PM"
              icon="time-outline"
            />
          </View>
        </View>

        <LocationInput />

        {/* Map Preview */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name="map" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.inputLabel}>Map Preview</Text>
          </View>
          <TouchableOpacity style={styles.mapContainer} onPress={openMapPicker}>
            {form.coordinates ? (
              <View style={styles.mapPreviewContainer}>
                <MapView
                  style={styles.mapPreview}
                  region={{
                    latitude: form.coordinates.latitude,
                    longitude: form.coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={form.coordinates}
                    title="Event Location"
                    pinColor={Colors.primary}
                  />
                </MapView>
                <View style={styles.mapPreviewOverlay}>
                  <View style={styles.mapPreviewBadge}>
                    <Ionicons name="location" size={12} color={Colors.white} />
                    <Text style={styles.mapPreviewBadgeText}>Selected Location</Text>
                  </View>
                </View>
              </View>
            ) : (
              <BlurView intensity={80} style={styles.mapBlur}>
                <View style={styles.mapContent}>
                  <Ionicons name="map" size={48} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.mapText}>Tap to choose location</Text>
                </View>
              </BlurView>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Step 3: Invite Friends, Max Guests
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Invite People</Text>
        <Text style={styles.stepSubtitle}>Who do you want to invite?</Text>
      </View>

      <View style={styles.formSection}>
        {/* Search Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.inputLabel}>Search Friends</Text>
          </View>
          <BlurView intensity={80} style={styles.inputBlur}>
            <TextInput
              style={styles.textInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </BlurView>
        </View>

        {/* Friends List */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name="people" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.inputLabel}>Invite Friends</Text>
          </View>
          <View style={styles.friendsList}>
            {filteredFriends.map((friend) => (
              <TouchableOpacity
                key={friend.id}
                style={[
                  styles.friendItem,
                  form.invitedFriends.includes(friend.id) && styles.friendItemSelected
                ]}
                onPress={() => {
                  const updatedFriends = form.invitedFriends.includes(friend.id)
                    ? form.invitedFriends.filter(id => id !== friend.id)
                    : [...form.invitedFriends, friend.id];
                  updateForm('invitedFriends', updatedFriends);
                  
                  // Auto-update max guests to number of invited friends (if not already higher)
                  const currentMax = parseInt(form.maxGuests) || 0;
                  if (updatedFriends.length > currentMax) {
                    updateForm('maxGuests', updatedFriends.length.toString());
                  }
                }}
              >
                <BlurView intensity={80} style={styles.friendBlur}>
                  <View style={[
                    styles.friendContent,
                    form.invitedFriends.includes(friend.id) && styles.friendContentSelected
                  ]}>
                    <Image source={{ uri: friend.image }} style={styles.friendAvatar} />
                    <Text style={styles.friendName}>{friend.name}</Text>
                    {form.invitedFriends.includes(friend.id) && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <InputField
          label="Max Guests (Optional)"
          value={form.maxGuests}
          onChangeText={(text) => updateForm('maxGuests', text)}
          placeholder={form.invitedFriends.length > 0 ? `${form.invitedFriends.length} invited, increase if needed` : "Leave blank for unlimited"}
          icon="people-outline"
          numeric={true}
        />
      </View>
    </View>
  );

  // Event Card Preview Component
  const EventCardPreview: React.FC = () => {
    const invitedFriendsData = filteredFriends.filter(friend => 
      form.invitedFriends.includes(friend.id)
    );

    return (
      <View style={styles.eventCardPreview}>
        <TouchableOpacity
          style={styles.previewCard}
          activeOpacity={0.95}
        >
          <ImageBackground
            source={form.image ? { uri: form.image } : undefined}
            style={[
              styles.previewCardBackground,
              !form.image && { backgroundColor: form.color }
            ]}
            imageStyle={styles.previewCardBackgroundImage}
          >
            {/* Enhanced Glassmorphism Overlay */}
            <BlurView intensity={15} style={styles.previewCardBlur}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.previewCardGlassLayer}
              >
                {/* Weather Widget */}
                <View style={styles.previewWeatherWidget}>
                  <BlurView intensity={60} style={styles.previewWeatherBlur}>
                    <View style={styles.previewWeatherContent}>
                      <Ionicons name="sunny" size={16} color={Colors.white} />
                      <Text style={styles.previewWeatherText}>72°</Text>
                    </View>
                  </BlurView>
                </View>

                {/* Hosting Badge */}
                <View style={styles.previewHostingBadge}>
                  <BlurView intensity={60} style={styles.previewHostingBadgeBlur}>
                    <View style={styles.previewHostingBadgeGradient}>
                      <Ionicons name="star" size={12} color={Colors.white} />
                      <Text style={styles.previewHostingText}>Hosting</Text>
                    </View>
                  </BlurView>
                </View>

                {/* Privacy Badge */}
                <View style={styles.previewPrivacyBadge}>
                  <BlurView intensity={60} style={styles.previewPrivacyBadgeBlur}>
                    <View style={[
                      styles.previewPrivacyBadgeContent,
                      form.privacy === 'PUBLIC' ? styles.previewPrivacyBadgePublic : styles.previewPrivacyBadgePrivate
                    ]}>
                      <Ionicons 
                        name={form.privacy === 'PUBLIC' ? 'globe' : 'lock-closed'} 
                        size={12} 
                        color={Colors.white} 
                      />
                      <Text style={styles.previewPrivacyText}>
                        {form.privacy === 'PUBLIC' ? 'Public' : 'Private'}
                      </Text>
                    </View>
                  </BlurView>
                </View>

                {/* Enhanced Text Readability with Dark Gradient */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                  style={styles.previewTextReadabilityGradient}
                >
                  <View style={styles.previewCardContent}>
                    {/* Glass Text Container */}
                    <BlurView intensity={40} style={styles.previewTextContainer}>
                      <View style={styles.previewTextContainerInner}>
                        <Text style={styles.previewEventTitle}>
                          {form.name || 'Your Event Name'}
                        </Text>
                        <Text style={styles.previewEventDate}>
                          {form.date || 'Select Date'} • {form.time || 'Select Time'}
                        </Text>
                        <Text style={styles.previewEventLocation}>
                          {form.location || 'Choose Location'}
                        </Text>
                      </View>
                    </BlurView>

                    {/* Enhanced Attendee Avatars */}
                    {invitedFriendsData.length > 0 && (
                      <View style={styles.previewAttendeeRow}>
                        <View style={styles.previewAttendeeAvatars}>
                          {invitedFriendsData.slice(0, 4).map((friend, avatarIndex) => (
                            <View
                              key={friend.id}
                              style={[
                                styles.previewAttendeeAvatar,
                                {
                                  marginLeft: avatarIndex > 0 ? -8 : 0,
                                  zIndex: 4 - avatarIndex,
                                }
                              ]}
                            >
                              <Image
                                source={{ uri: friend.image }}
                                style={styles.previewAvatarImage}
                              />
                              <View style={styles.previewAvatarGlow} />
                            </View>
                          ))}
                          {invitedFriendsData.length > 4 && (
                            <View style={[styles.previewAttendeeAvatar, styles.previewMoreAttendees]}>
                              <Text style={styles.previewMoreAttendeesText}>
                                +{invitedFriendsData.length - 4}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.previewAttendeeCountText}>
                          {invitedFriendsData.length} invited
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </LinearGradient>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 4: Event Summary
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Event Preview</Text>
        <Text style={styles.stepSubtitle}>Here's how your event will look</Text>
      </View>

      <EventCardPreview />
    </View>
  );

  // Step 5: Event Created - Share Link
  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successContainer}>
        <View style={styles.successIconContainer}>
          <BlurView intensity={80} style={styles.successIconBlur}>
            <View style={styles.successIconContent}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.systemGreen} />
            </View>
          </BlurView>
        </View>
        
        <Text style={styles.successTitle}>Event Created! 🎉</Text>
        <Text style={styles.successSubtitle}>
          Your event "{form.name}" has been created successfully
        </Text>

        <View style={styles.shareContainer}>
          <BlurView intensity={80} style={styles.shareBlur}>
            <View style={styles.shareContent}>
              <Text style={styles.shareLabel}>Event Link</Text>
              <Text style={styles.shareLink}>meetup.app/event/abc123</Text>
            </View>
          </BlurView>
        </View>

        <View style={styles.shareButtons}>
          <GlassButton
            title="Share Link"
            icon="share"
            onPress={handleShareEvent}
            variant="primary"
          />
          <GlassButton
            title="View Event"
            icon="eye"
            onPress={() => Alert.alert('Navigate', 'Would navigate to event details')}
            variant="secondary"
          />
        </View>
      </View>
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
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Step Indicator */}
      <StepIndicator />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <View style={styles.navigationContainer}>
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <GlassButton
                title="Back"
                onPress={handleBack}
                variant="secondary"
                icon="chevron-back"
              />
            )}
            
            <View style={styles.navigationSpacer} />
            
            {currentStep < 4 ? (
              <GlassButton
                title="Next"
                onPress={handleNext}
                variant="primary"
                icon="chevron-forward"
                disabled={!isStepValid()}
              />
            ) : (
              <GlassButton
                title={isCreating ? "Creating..." : "Create Event"}
                onPress={handleCreateEvent}
                variant="primary"
                icon={isCreating ? "hourglass" : "checkmark"}
                disabled={isCreating || !isStepValid()}
              />
            )}
          </View>
        </View>
      )}

      {/* Date and Time Pickers */}
      <CustomDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateSelection}
        title="Select Date"
      />
      
      <CustomTimePicker
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelect={handleTimeSelection}
      />
      
      <MapPickerModal />

      {/* Location Naming Modal */}
      <Modal
        visible={showLocationNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationNameModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowLocationNameModal(false)}
        >
          <View style={styles.locationNameModalContainer}>
            <BlurView intensity={100} tint="dark" style={styles.locationNameModalBlur}>
              <View style={styles.locationNameModalContent}>
                <Text style={styles.locationNameModalTitle}>
                  Name This Location
                </Text>
                <Text style={styles.locationNameModalSubtitle}>
                  {selectedLocationForNaming?.name}
                </Text>
                <Text style={styles.locationNameModalAddress}>
                  {selectedLocationForNaming?.address}
                </Text>
                
                <View style={styles.locationNameInputContainer}>
                  <BlurView intensity={80} tint="dark" style={styles.locationNameInputBlur}>
                    <TextInput
                      style={styles.locationNameInput}
                      placeholder="e.g., Ahmed's House, The Office, etc."
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      onChangeText={(text) => {
                        // Store in temporary state for the modal
                        setLocationQuery(text);
                      }}
                      autoFocus={true}
                    />
                  </BlurView>
                </View>
                
                <View style={styles.locationNameModalButtons}>
                  <TouchableOpacity
                    style={[styles.locationNameModalButton, styles.locationNameModalButtonSecondary]}
                    onPress={() => {
                      // Use original location name
                      confirmLocationWithName();
                    }}
                  >
                    <Text style={styles.locationNameModalButtonTextSecondary}>Use Original</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.locationNameModalButton, styles.locationNameModalButtonPrimary]}
                    onPress={() => {
                      // Use custom name
                      confirmLocationWithName(locationQuery);
                    }}
                  >
                    <Text style={styles.locationNameModalButtonText}>Save Custom Name</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepNumber: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: Spacing.xs,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContainer: {
    flex: 1,
    padding: Spacing.xl,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  formSection: {
    gap: Spacing.lg,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 50,
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateTimeItem: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeItem: {
    width: (width - Spacing.xl * 2 - Spacing.sm * 2) / 3,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  typeItemSelected: {
    transform: [{ scale: 0.95 }],
  },
  typeBlur: {
    borderRadius: BorderRadius.lg,
  },
  typeContent: {
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeName: {
    fontSize: FontSize.xs,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  colorItemSelected: {
    borderWidth: 2,
    borderColor: Colors.white,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorCheck: {
    position: 'absolute',
  },
  backgroundToggleContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backgroundToggleButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  backgroundToggleButtonActive: {
    transform: [{ scale: 0.98 }],
  },
  backgroundToggleBlur: {
    borderRadius: BorderRadius.lg,
  },
  backgroundToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.sm,
  },
  backgroundToggleContentActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  backgroundToggleText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  backgroundToggleTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
  imageSelector: {
    height: 160,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  imageSelectorBlur: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  imageSelectorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
  },
  selectedImageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  imageSelectorText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  imageSelectorSubtext: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  mapContainer: {
    height: 120,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  mapPreviewContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  mapPreview: {
    flex: 1,
    height: 120,
  },
  mapPreviewOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
  },
  mapPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  mapPreviewBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.medium,
  },
  mapBlur: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  mapContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  mapText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: FontWeight.medium,
    marginTop: Spacing.sm,
  },
  friendsList: {
    gap: Spacing.sm,
  },
  friendItem: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  friendItemSelected: {
    transform: [{ scale: 0.98 }],
  },
  friendBlur: {
    borderRadius: BorderRadius.lg,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.md,
  },
  friendContentSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.white,
    fontWeight: FontWeight.medium,
  },
  summaryContainer: {
    gap: Spacing.lg,
  },
  summaryBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.large,
  },
  summaryContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  summaryColorBar: {
    width: 4,
    height: 50,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  summaryImagePreview: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  summaryImage: {
    width: '100%',
    height: '100%',
  },
  summaryImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  summaryType: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryDetails: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.large,
  },
  successIconBlur: {
    flex: 1,
    borderRadius: 60,
  },
  successIconContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  shareContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  shareBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  shareContent: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  shareLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.sm,
  },
  shareLink: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  navigationContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 70,
    paddingTop: Spacing.lg,
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  navigationSpacer: {
    flex: 1,
  },
  glassButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    minWidth: 100,
    ...Shadows.medium,
  },
  glassButtonDisabled: {
    opacity: 0.5,
  },
  glassButtonBlur: {
    borderRadius: BorderRadius.lg,
  },
  glassButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  glassButtonPrimary: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  glassButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassButtonContentDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  glassButtonSecondaryText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  glassButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  // Date/Time Picker Styles
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: FontSize.md,
    color: Colors.white,
    flex: 1,
  },
  pickerPlaceholder: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalBlur: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  pickerContainer: {
    padding: Spacing.lg,
  },
  pickerHelperText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  quickSelectContainer: {
    marginBottom: Spacing.lg,
  },
  quickSelectTitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.sm,
    fontWeight: FontWeight.semibold,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickSelectButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickSelectButtonText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  timePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timePickerButton: {
    width: (width - Spacing.lg * 2 - Spacing.sm * 3) / 4,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timePickerButtonText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  // Calendar Styles
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  monthYearText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayHeaderText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: FontWeight.semibold,
    paddingVertical: Spacing.sm,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  calendarDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  calendarDayEmpty: {
    // Empty style for spacing
  },
  calendarDayToday: {
    backgroundColor: Colors.primary,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: FontSize.md,
    color: Colors.white,
    fontWeight: FontWeight.medium,
  },
  calendarDayTextToday: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  calendarDayTextPast: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  // Time Picker Wheel Styles
  timeDisplayContainer: {
    marginBottom: Spacing.lg,
  },
  timeDisplayBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  timeDisplayContent: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  timeDisplayText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  timeWheelContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  wheelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.sm,
    fontWeight: FontWeight.semibold,
  },
  wheel: {
    height: 120,
    width: '100%',
  },
  wheelItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginVertical: 2,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  wheelItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  wheelItemText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  wheelItemTextSelected: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  periodContainer: {
    width: '100%',
    gap: Spacing.xs,
  },
  periodButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  periodButtonSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  periodButtonText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  periodButtonTextSelected: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  confirmTimeButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  confirmTimeBlur: {
    borderRadius: BorderRadius.lg,
  },
  confirmTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    gap: Spacing.sm,
  },
  confirmTimeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  // Location Input Styles
  locationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  locationActionButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  locationActionBlur: {
    borderRadius: BorderRadius.lg,
  },
  locationActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: Spacing.sm,
  },
  locationActionText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.medium,
  },
  suggestionsContainer: {
    marginTop: Spacing.sm,
    maxHeight: 200,
  },
  suggestionsBlur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  suggestionsContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: FontSize.md,
    color: Colors.white,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  suggestionAddress: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // Map Modal Styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  fullMap: {
    flex: 1,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  map: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  mapInstructions: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: Spacing.md,
  },
  mapInstructionsText: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  confirmLocationButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.medium,
  },
  confirmLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  confirmLocationText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  // Event Card Preview Styles
  eventCardPreview: {
    marginBottom: Spacing.lg,
  },
  previewCard: {
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.large,
  },
  previewCardBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewCardBackgroundImage: {
    borderRadius: BorderRadius.xl,
  },
  previewCardBlur: {
    flex: 1,
    borderRadius: BorderRadius.xl,
  },
  previewCardGlassLayer: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    position: 'relative',
  },
  previewWeatherWidget: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
  previewWeatherBlur: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewWeatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: Spacing.xs,
  },
  previewWeatherText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.semibold,
  },
  previewHostingBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  previewHostingBadgeBlur: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewHostingBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    gap: Spacing.xs,
  },
  previewHostingText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  previewTextReadabilityGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  previewCardContent: {
    gap: Spacing.md,
  },
  previewTextContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  previewTextContainerInner: {
    padding: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  previewEventTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  previewEventDate: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  previewEventLocation: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: FontWeight.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  previewAttendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewAttendeeAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAttendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.white,
    position: 'relative',
    overflow: 'hidden',
  },
  previewAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  previewAvatarGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: -1,
  },
  previewMoreAttendees: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMoreAttendeesText: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  previewAttendeeCountText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: FontWeight.semibold,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  locationNameModalContainer: {
    margin: Spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    ...Shadows.large,
  },
  locationNameModalBlur: {
    borderRadius: 20,
  },
  locationNameModalContent: {
    padding: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationNameModalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  locationNameModalSubtitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  locationNameModalAddress: {
    fontSize: FontSize.md,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  locationNameInputContainer: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  locationNameInputBlur: {
    borderRadius: BorderRadius.lg,
  },
  locationNameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.white,
    minHeight: 50,
  },
  locationNameModalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  locationNameModalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  locationNameModalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  locationNameModalButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationNameModalButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  locationNameModalButtonTextSecondary: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  privacyToggleContainer: {
    gap: Spacing.md,
  },
  privacyToggleButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.small,
  },
  privacyToggleButtonActive: {
    transform: [{ scale: 0.98 }],
  },
  privacyToggleBlur: {
    borderRadius: BorderRadius.lg,
  },
  privacyToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.md,
  },
  privacyToggleContentActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  privacyToggleTextContainer: {
    flex: 1,
  },
  privacyToggleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.xs,
  },
  privacyToggleTitleActive: {
    color: Colors.white,
  },
  privacyToggleSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  privacyToggleSubtitleActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  previewPrivacyBadge: {
    position: 'absolute',
    top: Spacing.md + 40, // Below hosting badge
    left: Spacing.md,
  },
  previewPrivacyBadgeBlur: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewPrivacyBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  previewPrivacyBadgePublic: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)', // Green for public
  },
  previewPrivacyBadgePrivate: {
    backgroundColor: 'rgba(168, 85, 247, 0.9)', // Purple for private
  },
  previewPrivacyText: {
    fontSize: FontSize.sm,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },

});

export default CreateEventScreen; 