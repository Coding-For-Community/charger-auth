import { useAsyncEffect } from "@/lib/useAsyncEffect";
import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter()
  const storage = useAsyncStorage('studentId')
  useAsyncEffect(async () => {
    const studentId = await storage.getItem()
    router.replace(studentId ? "/HomePage" : "/MainSigninPage")
  }, [])

  return (
    <View style={{alignItems: 'center', justifyContent: 'center', flex: 1}}>
      <ActivityIndicator size={50} />
    </View>
  )
}