import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, TouchableOpacity } from "react-native";

export default function HomePage() {
  return (
    <TouchableOpacity onPress={() => AsyncStorage.clear()}>
      <Text>Clear Student ID(testing only)</Text>
    </TouchableOpacity>
  )
}