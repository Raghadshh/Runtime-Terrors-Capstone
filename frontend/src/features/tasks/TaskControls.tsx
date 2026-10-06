/**
 * Small controls used by the F1 task screens. Selected state is shown with a check mark and bold text,
 * not color alone (NF2).
 */
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

export function Chip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[44px] justify-center rounded-full border-[1.5px] px-4 ${selected ? "border-leaf bg-[#E7F6EC]" : "border-sage bg-white"}`}
    >
      <Text className={`text-[15px] text-ink ${selected ? "font-strong" : "font-body"}`}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}

/** "−  value  +" control with large touch targets. */
export function Stepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-[20px] bg-white px-2 py-1">
      <Pressable accessibilityRole="button" accessibilityLabel={`Earlier ${label}`} onPress={onMinus} className="h-12 w-12 items-center justify-center">
        <Text className="font-strong text-[24px] text-ink">−</Text>
      </Pressable>
      <Text accessibilityLabel={`${label}: ${value}`} className="flex-1 text-center font-strong text-[17px] text-ink">
        {value}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Later ${label}`} onPress={onPlus} className="h-12 w-12 items-center justify-center">
        <Text className="font-strong text-[24px] text-ink">+</Text>
      </Pressable>
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-2 mt-5 font-strong text-[13px] tracking-wide text-ink">{children}</Text>;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" className="mt-1.5 font-body text-[13px] text-[#9C4A4A]">
      ⚠ {message}
    </Text>
  );
}