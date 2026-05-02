import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

const iconFontFamily = Ionicons.getFontFamily();

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
              style={{ fontFamily: iconFontFamily }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={size}
              color={color}
              style={{ fontFamily: iconFontFamily }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
