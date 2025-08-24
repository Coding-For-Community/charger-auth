import { SafeAreaView, Text, View } from "react-native";
import { SignInButton } from "./components/SignInButton";
import { SignInTextInput } from "./components/SignInTextInput";
import { useState } from "react";
import { Stack } from "expo-router";

export default function SignInWithEmail() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={{
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
    }}>
      {/* Disables header */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#111827', // Dark text for high contrast
          marginBottom: 16,
        }}>
          Sign In with Email
        </Text>
        <SignInTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="CA Email"
        />
        <SignInTextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Computer Password"
          secureTextEntry
        />
        <SignInButton onPress={() => {}} />
      </View>
    </SafeAreaView>
  )
}

