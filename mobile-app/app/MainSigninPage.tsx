import AsyncStorage, { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { Link, Stack, useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { SignInButton } from "./components/SignInButton";
import { SignInTextInput } from "./components/SignInTextInput";

export default function MainSigninPage() {
  const [studentId, setStudentId] = useState('')
  const router = useRouter()

  async function handleStudentIdLogin() {
    if (studentId.trim() === '') {
      alert('Please enter your Student ID.');
      return;
    }
    await AsyncStorage.setItem('studentId', studentId);
    router.navigate('/HomePage');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/*Disables header */}
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Main Content Area */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>Welcome to ChargerAuth!</Text>
          <Text style={styles.subtitle}>Enter your Student ID to sign in</Text>
          <SignInTextInput
            value={studentId}
            onChangeText={setStudentId}
            onSubmitEditing={handleStudentIdLogin}
            placeholder="Student ID"
          />
          <SignInButton onPress={handleStudentIdLogin} />
        </View>

        {/* Footer Area for Secondary Action */}
        <View style={styles.footer}>
          <Link href="/SignInWithEmail">
            <Text style={styles.secondaryButtonText}>
              Or Sign In with Email & Password
            </Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827', // Dark text for high contrast
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563', // A softer, medium gray
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db', // Light border color
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  footer: {
    width: '100%',
    paddingBottom: 40,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3b82f6', // Use the same brand color for consistency
    fontSize: 16,
    fontWeight: '500',
  },
});