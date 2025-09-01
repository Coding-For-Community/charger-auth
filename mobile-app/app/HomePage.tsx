import { BACKEND_URL } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from 'qrcode.react';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomePage() {
  const tokenQuery = useQuery({
    queryKey: ["qrCodeToken"],
    queryFn: async () => {
      const res = await fetch(BACKEND_URL + "/checkin/token/")
      return (await res.json())
    },
    refetchInterval: (query) => {
      if (!query.state.data) {
        return false
      }
      return query.state.data["time_until_refresh"]
    }
  })
  const userId = useQuery({
    queryKey: ["userId"],
    queryFn: () => AsyncStorage.getItem("studentId"),
    staleTime: Infinity
  })

  if (userId.isSuccess && tokenQuery.isSuccess) {
    return (
      <View style={styles.mainContent}>
        <QRCodeSVG value={userId.data + ";" + tokenQuery.data["id"]} />
        
        <TouchableOpacity onPress={() => AsyncStorage.clear()}>
          <Text>Clear Student ID(testing only)</Text>
        </TouchableOpacity>
      </View>
    )
  } else if (userId.isError || tokenQuery.isError) {
    return (
      <View>
        <Text>Oops error</Text>
      </View>
    )
  } else {
    return (
      <View>
        <Text>...</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
})