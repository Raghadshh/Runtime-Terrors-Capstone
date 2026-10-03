/**
 * Full width action button, Primary is leaf green, secondary is an outlined cream button, quiet is text only.
 */
import { Pressable, Text } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const shell =
    variant === "primary"
      ? "bg-leaf"
      : variant === "secondary"
        ? "border-[1.5px] border-sage bg-cream"
        : "bg-transparent";
  const ink = variant === "primary" ? "text-forest" : "text-ink";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`h-14 w-full items-center justify-center rounded-[20px] ${shell} ${disabled ? "opacity-50" : "active:opacity-80"}`}
    >
      <Text className={`font-brand text-[18px] ${ink}`}>{label}</Text>
    </Pressable>
  );
}
