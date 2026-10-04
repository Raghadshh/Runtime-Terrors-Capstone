/**
 * Dashboard header with a back control, centered title, and an optional text action on the right.
 */
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BackIcon } from "@/components/icons";

interface HeaderProps {
  title: string;
  right?: string;
  onRight?: () => void;
}

export function Header({ title, right, onRight }: HeaderProps) {
  const router = useRouter();
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
        <BackIcon />
      </Pressable>
      <Text className="flex-1 text-center font-strong text-[21px] text-ink">{title}</Text>
      {right && onRight ? (
        <Pressable accessibilityRole="button" onPress={onRight} className="h-10 min-w-10 items-center justify-center">
          <Text className="font-strong text-[14px] text-sprout">{right}</Text>
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}
    </View>
  );
}
