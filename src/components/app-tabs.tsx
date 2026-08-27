import { Tabs } from "expo-router";
import { Text } from "react-native";

import { GrandbookTheme } from "@/constants/grandbook-theme";

const colors = GrandbookTheme.colors;
const tabIcons = {
  index: "⌂",
  read: "◷",
  word: "⌕",
  liturgy: "✦",
} as const;
export default function AppTabs() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.cream,
        },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 22, fontWeight: "700" }}>
            {tabIcons[route.name as keyof typeof tabIcons] ?? "•"}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="read" options={{ title: "Read" }} />
      <Tabs.Screen name="word" options={{ title: "Discover" }} />
      <Tabs.Screen name="liturgy" options={{ title: "Liturgy" }} />
    </Tabs>
  );
}
