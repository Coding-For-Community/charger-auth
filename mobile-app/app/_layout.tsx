import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      
      <Stack.Screen name="MainSigninPage" options={{ headerShown: false }} />
      <Stack.Screen name="SignInWithEmail" options={{ headerShown: false }} />
      <Stack.Screen name="HomePage" options={{ headerShown: false }} />
    </Stack>
  );
}
