import { Tabs } from "expo-router"
import Feather from "@expo/vector-icons/Feather"

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="TestPage"
        options={{
          title: "Order",
          headerShown: false,
          tabBarIcon: args => (
            <Feather name="coffee" {...args} />
          ),
        }}
      />
    </Tabs>
  )
}
