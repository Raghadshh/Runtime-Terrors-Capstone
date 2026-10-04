/**
 * Page chrome, Screen applies the selected theme and an optional footer, Brand, ChoiceCard, FormError, and EmptyState lives here.
 */
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { useRemind } from "@/lib/store";
import type { ThemeId } from "@/lib/types";

const screenThemes: Record<ThemeId, string> = {
  cream: "bg-[#FFF9F0]",
  sky: "bg-[#F3F8FC]",
  blush: "bg-[#FFF6F2]",
  sage: "bg-[#F4F7F2]",
};

interface ScreenProps {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}

export function Screen({ children, footer, scroll = true }: ScreenProps) {
  const { session, syncNote } = useRemind();
  const background = screenThemes[session?.theme ?? "cream"];
  const body = scroll ? (
    <ScrollView className="flex-1" contentContainerClassName="px-7 pb-8" keyboardShouldPersistTaps="handled">
      {syncNote ? <Text className="mb-3 font-body text-[13px] text-mist">{syncNote}</Text> : null}
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-7">
      {syncNote ? <Text className="mb-3 font-body text-[13px] text-mist">{syncNote}</Text> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView className={`flex-1 ${background}`}>
      {body}
      {footer ? <View className="gap-3 px-7 pb-6">{footer}</View> : null}
    </SafeAreaView>
  );
}

interface BrandProps {
  subtitle: string;
}

export function Brand({ subtitle }: BrandProps) {
  return (
    <View className="mb-8 mt-8 items-center gap-2.5">
      <Text className="font-display text-[42px] text-ink">
        Remind<Text className="text-leaf">ME</Text>
      </Text>
      <Text className="text-center font-soft text-[17px] text-ink">{subtitle}</Text>
    </View>
  );
}

interface ChoiceCardProps {
  title: string;
  body: string;
  selected?: boolean;
  onPress: () => void;
}

export function ChoiceCard({ title, body, selected = false, onPress }: ChoiceCardProps) {
  return (
    <ButtonShell selected={selected} onPress={onPress}>
      <Text className="font-brand text-[13px] leading-[18px] text-muted">{title}</Text>
      <Text className="font-soft text-[17px] leading-[23px] text-ink">{body}</Text>
    </ButtonShell>
  );
}

function ButtonShell({
  children,
  onPress,
  selected,
}: {
  children: ReactNode;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`h-[82px] w-full justify-center gap-1.5 rounded-[20px] bg-white p-[14px] ${selected ? "border-[1.5px] border-leaf" : ""}`}
    >
      {children}
    </Pressable>
  );
}

export function Footnote({ children }: { children: string }) {
  return <Text className="text-center font-soft text-[14px] text-ink">{children}</Text>;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return <Text className="text-center font-body text-[14px] text-[#9C4A4A]">{message}</Text>;
}

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View className="items-center gap-3 rounded-[20px] bg-white px-5 py-8">
      <Text className="text-center font-strong text-[17px] text-ink">{title}</Text>
      <Text className="text-center font-body text-[14px] text-mist">{body}</Text>
      {action && onAction ? <Button label={action} onPress={onAction} /> : null}
    </View>
  );
}
