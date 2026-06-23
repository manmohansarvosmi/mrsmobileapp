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
  Alert,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../../App';
import { Colors, Typography, CommonStyles } from '../../utils/theme';

const AdminProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [companyName, setCompanyName] = useState('MRS Poorva Enterprises');
  const [designation, setDesignation] = useState('Chief Administrator');
  const [adminName, setAdminName] = useState('Manmohan Sarvosmi');
  const [address, setAddress] = useState('Gwalior, Madhya Pradesh');
  const [gstin, setGstin] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const storedCompany = await AsyncStorage.getItem('companyName');
    const storedAdmin = await AsyncStorage.getItem('adminName');
    const storedDesignation = await AsyncStorage.getItem('designation');
    const storedGstin = await AsyncStorage.getItem('gstin');
    const storedEmail = await AsyncStorage.getItem('email');
    const storedMobile = await AsyncStorage.getItem('mobile');
    const storedAddress = await AsyncStorage.getItem('address');

    if (storedCompany) setCompanyName(storedCompany);
    if (storedAdmin) setAdminName(storedAdmin);
    if (storedDesignation) setDesignation(storedDesignation);
    if (storedGstin) setGstin(storedGstin);
    if (storedEmail) setEmail(storedEmail);
    if (storedMobile) setMobile(storedMobile);
    if (storedAddress) setAddress(storedAddress);
  };

  const saveProfile = async () => {
    await Promise.all([
      AsyncStorage.setItem('companyName', companyName),
      AsyncStorage.setItem('adminName', adminName),
      AsyncStorage.setItem('designation', designation),
      AsyncStorage.setItem('gstin', gstin),
      AsyncStorage.setItem('email', email),
      AsyncStorage.setItem('mobile', mobile),
      AsyncStorage.setItem('address', address),
    ]);
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#e11d2e" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.text.main} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Profile</Text>
        <TouchableOpacity onPress={() => (isEditing ? saveProfile() : setIsEditing(true))} style={styles.editBtn}>
          <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
            <View style={styles.avatarLarge}>
               <Text style={styles.avatarTextLarge}>{adminName[0]}</Text>
               <TouchableOpacity style={styles.cameraIcon}>
                  <Icon name="photo-camera" size={16} color="#fff" />
               </TouchableOpacity>
            </View>
            <View style={styles.profileInfo}>
               {isEditing ? (
                 <TextInput 
                   style={styles.nameInput} 
                   value={adminName} 
                   onChangeText={setAdminName}
                   placeholder="Admin Name"
                 />
               ) : (
                 <Text style={styles.userName}>{adminName}</Text>
               )}
               {isEditing ? (
                 <TextInput 
                   style={styles.designationInput} 
                   value={designation} 
                   onChangeText={setDesignation}
                   placeholder="Designation"
                 />
               ) : (
                 <Text style={styles.userRole}>{designation}</Text>
               )}
            </View>
        </View>

        {/* Company Settings Section */}
        <View style={styles.section}>
           <Text style={styles.sectionTitle}>COMPANY INFORMATION</Text>
           <View style={styles.infoBox}>
              <View style={styles.inputGroup}>
                 <Text style={styles.label}>LEGAL NAME</Text>
                 <TextInput 
                   style={[styles.input, !isEditing && styles.inputDisabled]} 
                   value={companyName}
                   editable={isEditing}
                   onChangeText={setCompanyName}
                   placeholder="Enter Company Name"
                 />
              </View>
              <View style={styles.inputGroup}>
                 <Text style={styles.label}>GSTIN / TAX ID</Text>
                 <TextInput 
                   style={[styles.input, !isEditing && styles.inputDisabled]} 
                   value={gstin}
                   editable={isEditing}
                   onChangeText={setGstin}
                   placeholder="e.g. 23AAAAA0000A1Z5"
                   autoCapitalize="characters"
                 />
              </View>
              <View style={styles.twoCol}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                   <Text style={styles.label}>MOBILE</Text>
                   <TextInput 
                     style={[styles.input, !isEditing && styles.inputDisabled]} 
                     value={mobile}
                     editable={isEditing}
                     onChangeText={setMobile}
                     placeholder="Contact Number"
                     keyboardType="phone-pad"
                   />
                </View>
                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                   <Text style={styles.label}>OFFICIAL EMAIL</Text>
                   <TextInput 
                     style={[styles.input, !isEditing && styles.inputDisabled]} 
                     value={email}
                     editable={isEditing}
                     onChangeText={setEmail}
                     placeholder="admin@company.com"
                     keyboardType="email-address"
                     autoCapitalize="none"
                   />
                </View>
              </View>
              <View style={styles.inputGroup}>
                 <Text style={styles.label}>LOCATED AT (ADDRESS)</Text>
                 <TextInput 
                   style={[styles.input, !isEditing && styles.inputDisabled]} 
                   value={address}
                   editable={isEditing}
                   onChangeText={setAddress}
                   multiline
                   placeholder="Full business address"
                 />
              </View>
           </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionSection}>
           <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIconBox, { backgroundColor: '#eff6ff' }]}>
                 <Icon name="business-center" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.actionLabel}>Company Branding & Logo</Text>
              <Icon name="chevron-right" size={20} color={Colors.text.light} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.actionItem}>
              <View style={[styles.actionIconBox, { backgroundColor: '#fdf2f2' }]}>
                 <Icon name="security" size={20} color="#ef4444" />
              </View>
              <Text style={styles.actionLabel}>Security Settings</Text>
              <Icon name="chevron-right" size={20} color={Colors.text.light} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Icon name="logout" size={20} color="#fff" />
              <Text style={styles.logoutText}>Log Out from Session</Text>
           </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>MRS Hub Admin • Version 2.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.main },
  editBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0' },
  editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  
  scrollContent: { padding: 20 },
  
  profileCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 12,
    marginBottom: 25,
    ...CommonStyles.shadow
  },
  avatarLarge: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: Colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 20
  },
  avatarTextLarge: { color: '#fff', fontSize: 28, fontWeight: '800' },
  cameraIcon: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: '#333', 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '800', color: Colors.text.main },
  userRole: { fontSize: 14, color: Colors.text.light, marginTop: 2 },
  nameInput: { fontSize: 18, fontWeight: '800', color: Colors.text.main, borderBottomWidth: 1, borderBottomColor: Colors.primary, padding: 0 },
  designationInput: { fontSize: 14, color: Colors.text.light, borderBottomWidth: 1, borderBottomColor: Colors.border, padding: 0, marginTop: 4 },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: Colors.text.light, letterSpacing: 1.5, marginBottom: 12 },
  infoBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, ...CommonStyles.shadow },
  twoCol: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '800', color: Colors.text.light, marginBottom: 6 },
  input: { fontSize: 15, fontWeight: '700', color: Colors.text.main, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  inputDisabled: { color: Colors.text.light, borderBottomWidth: 0 },
  
  actionSection: { gap: 12 },
  actionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 12,
    ...CommonStyles.shadow
  },
  actionIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text.main },
  
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#333', 
    paddingVertical: 16, 
    borderRadius: 12, 
    marginTop: 10,
    gap: 10
  },
  logoutText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  versionText: { textAlign: 'center', marginTop: 30, color: Colors.text.muted, fontSize: 12, letterSpacing: 1 },
});

export default AdminProfileScreen;
