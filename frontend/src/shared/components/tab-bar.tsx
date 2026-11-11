/**
 * Bottom navigation for the five dashboard tabs, and the active tab uses sprout green.
 */
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { HomeIcon, ProgressIcon, ProfileIcon, RoutinesIcon, TasksIcon } from "@/components/icons";

interface TabBarProps {
  state: {
    index: number;
    routes: { name: string; key: string }[];
  };
  navigation: {
    navigate: (name: string) => void;
  };
}

const tabs = [
  { name: "home", label: "Home", Icon: HomeIcon },
  { name: "tasks", label: "Tasks", Icon: TasksIcon },
  { name: "routines", label: "Routines", Icon: RoutinesIcon },
  { name: "progress", label: "Progress", Icon: ProgressIcon },
  { name: "profile", label: "Profile", Icon: ProfileIcon },
] as const;

export function RemindTabBar({ state, navigation }: TabBarProps) {
  const activeName = state.routes[state.index]?.name ?? "home";
  const activeRoot = activeName.split("/")[0] ?? activeName;
  return (
    <View className="flex-row border-t border-[#E4EFE4] bg-white px-2 pb-3 pt-2">
      {tabs.map((tab) => {
        const active = activeRoot === tab.name;
        const color = active ? "#2C7A4B" : "#294A60";
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => navigation.navigate(tab.name)}
            className="flex-1 items-center gap-1 py-1"
          >
            <tab.Icon color={color} />
            <Text className={`text-[11px] ${active ? "font-strong text-sprout" : "font-body text-ink"}`}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const dashboardRoutes = tabs.map(tab => ({ name: tab.name, key: tab.name }));

/** Bottom navigation for routes that are not the Home route bridge. */
export function DashboardTabBar({ activeIndex }: { activeIndex: number }) {
  const router = useRouter();
  function navigate(name: string) {
    if (name === "home") router.push("/home");
    else if (name === "tasks") router.push("/tasks");
    else if (name === "routines") router.push("/routines");
    else if (name === "progress") router.push("/progress");
    else if (name === "profile") router.push("/profile");
  }
  return (
    <RemindTabBar
      state={{ index: activeIndex, routes: dashboardRoutes }}
      navigation={{ navigate }}
    />
  );
}
