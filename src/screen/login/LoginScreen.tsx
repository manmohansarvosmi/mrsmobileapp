import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { authService } from '../../service/authService';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [isIdFocused, setIsIdFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!employeeId || !password) {
      Alert.alert('Error', 'Please enter both Employee ID and Password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login(employeeId, password);
      const role = response.userRole || '';
      if (role === 'ROLE_ADMIN' || role === 'ADMIN') {
        navigation.replace('AdminMain');
      } else {
        navigation.replace('Dashboard');
      }
    } catch (error: any) {
      // Fallback for dummy credentials if backend is down or not connected
      if (employeeId === 'admin' && password === 'admin') {
        console.warn('Backend login failed, but allowing admin/admin dummy credentials bypass');
        navigation.replace('AdminDashboard');
      } else {
        const message = error?.response?.data?.message || error?.message || 'Invalid credentials or server error.';
        Alert.alert('Login Failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#e11d2e" />

      {/* Visual Anchor Background */}
      <View style={styles.bgCircleTopRight} />
      <View style={styles.bgCircleBottomLeft} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../../asset/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>M.R.S. Purvia Enterprises</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <View style={styles.headerBox}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subText}>Please enter your credentials to access your portal.</Text>
          </View>

          {/* Employee ID Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employee ID</Text>
            <View style={[styles.inputContainer, isIdFocused && styles.inputFocused]}>
              <Icon name="person" size={20} color="#5f5e5e" style={styles.inputIconText} />
              <TextInput
                style={styles.input}
                value={employeeId}
                onChangeText={setEmployeeId}
                onFocus={() => setIsIdFocused(true)}
                onBlur={() => setIsIdFocused(false)}
                placeholder="Enter your ID"
                placeholderTextColor="#c8c6c5"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputContainer, isPasswordFocused && styles.inputFocused]}>
              <Icon name="lock" size={20} color="#5f5e5e" style={styles.inputIconText} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#c8c6c5"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.eyeIconBox}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Icon name={showPassword ? "visibility" : "visibility-off"} size={20} color="#5f5e5e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Options Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMe}
              activeOpacity={0.8}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkboxContainer, rememberMe && styles.checkboxContainerActive]}>
                <View style={[styles.checkboxThumb, rememberMe && styles.checkboxThumbActive]} />
              </View>
              <Text style={styles.rememberMeText}>Remember Me</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>SIGN IN</Text>
            )}
          </TouchableOpacity>

          {/* Contact Admin */}
          <View style={styles.contactAdminContainer}>
            <Text style={styles.firstTimeText}>First time here?</Text>
            <TouchableOpacity>
              <Text style={styles.contactAdminText}>Contact Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Badge / Visual Element */}


      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>© 2025 Helixion Innovations LLP. All rights reserved.</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLinkText}>Privacy Policy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLinkText}>Security</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLinkText}>Terms of Service</Text></TouchableOpacity>
          </View>
        </View>
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  bgCircleTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    backgroundColor: 'rgba(184, 0, 29, 0.05)',
    borderRadius: 200,
  },
  bgCircleBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    backgroundColor: 'rgba(229, 226, 225, 0.1)',
    borderRadius: 150,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: '#1a1c1c',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderTopWidth: 3,
    borderTopColor: '#e11d2e',
    elevation: 8,
    shadowColor: '#111',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  headerBox: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    color: '#1a1c1c',
    marginBottom: 6,
    fontWeight: '700',
  },
  subText: {
    fontSize: 14,
    color: '#5f5e5e',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d3f3d',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6bdb9',
    borderRadius: 8,
    height: 48,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: '#e11d2e',
  },
  inputIconText: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingLeft: 44,
    paddingRight: 44,
    fontSize: 16,
    color: '#1a1c1c',
    height: '100%',
  },
  eyeIconBox: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
    padding: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e5e2e1',
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
  },
  checkboxContainerActive: {
    backgroundColor: '#e11d2e',
  },
  checkboxThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  checkboxThumbActive: {
    transform: [{ translateX: 16 }],
  },
  rememberMeText: {
    fontSize: 14,
    color: '#5f5e5e',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b8001d',
  },
  loginBtn: {
    backgroundColor: '#e11d2e',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#e11d2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff8f7',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contactAdminContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e2e2',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  firstTimeText: {
    fontSize: 14,
    color: '#5f5e5e',
  },
  contactAdminText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1c',
    marginLeft: 6,
  },
  trustBadgeContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1c1c',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginLeft: 6,
  },
  footer: {
    backgroundColor: '#f3f3f3',
    borderTopWidth: 1,
    borderTopColor: '#e6bdb9',
    width: '100%',
  },
  footerContent: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    flexDirection: 'column',
  },
  footerText: {
    fontSize: 12,
    color: '#5f5e5e',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  footerLinkText: {
    fontSize: 12,
    color: '#5f5e5e',
  }
});

export default LoginScreen;
