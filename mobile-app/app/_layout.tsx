import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        <Stack.Screen name="MainSigninPage" options={{ headerShown: false }} />
        <Stack.Screen name="SignInWithEmail" options={{ headerShown: false }} />
        <Stack.Screen name="HomePage" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
    
  );
}
