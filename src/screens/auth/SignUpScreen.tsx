import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '../../constants';

const { width, height } = Dimensions.get('window');

const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignUp = async () => {
    if (!formData.name || !formData.email || !formData.username || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await signUp({
      name: formData.name.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      password: formData.password,
    });
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Sign Up Failed', result.error || 'An error occurred');
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop' }}
        style={styles.background}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        />
        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <BlurView intensity={60} style={styles.logoBlur}>
                  <View style={styles.logoContent}>
                    <Ionicons name="calendar" size={32} color={Colors.white} />
                  </View>
                </BlurView>
              </View>
              <Text style={styles.title}>Join MeetOn</Text>
              <Text style={styles.subtitle}>Create your account to get started</Text>
            </View>

            <View style={styles.formContainer}>
              <BlurView intensity={100} tint="dark" style={styles.formBlur}>
                <View style={styles.formContent}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.name}
                      onChangeText={(text) => updateForm('name', text)}
                      placeholder="Enter your full name"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.email}
                      onChangeText={(text) => updateForm('email', text)}
                      placeholder="Enter your email"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.username}
                      onChangeText={(text) => updateForm('username', text)}
                      placeholder="Choose a username"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.password}
                      onChangeText={(text) => updateForm('password', text)}
                      placeholder="Create a password"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      secureTextEntry={!showPassword}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.confirmPassword}
                      onChangeText={(text) => updateForm('confirmPassword', text)}
                      placeholder="Confirm your password"
                      placeholderTextColor="rgba(255, 255, 255, 0.5)"
                      secureTextEntry={!showPassword}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
                    onPress={handleSignUp}
                    disabled={isLoading}
                  >
                    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.signUpButtonGradient}>
                      <Text style={styles.signUpButtonText}>
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  background: { flex: 1, width, height },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoContainer: { marginBottom: Spacing.lg },
  logoBlur: { borderRadius: 25, overflow: 'hidden' },
  logoContent: { width: 80, height: 80, borderRadius: 25, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.white, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: FontSize.lg, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', lineHeight: 24 },
  formContainer: { borderRadius: 20, overflow: 'hidden', marginBottom: Spacing.xl, ...Shadows.large },
  formBlur: { borderRadius: 20 },
  formContent: { padding: Spacing.xl, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  inputContainer: { marginBottom: Spacing.lg },
  inputLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: 'rgba(255, 255, 255, 0.8)', marginBottom: Spacing.sm },
  textInput: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.white, minHeight: 50 },
  signUpButton: { borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.medium },
  signUpButtonDisabled: { opacity: 0.7 },
  signUpButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  signUpButtonText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: FontSize.md, color: 'rgba(255, 255, 255, 0.8)' },
  loginLink: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
});

export default SignUpScreen; 