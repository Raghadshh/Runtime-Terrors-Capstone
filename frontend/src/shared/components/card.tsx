/**
 * White rounded surface used on dashboard screens. Pass onPress when the whole card should navigate.
 */
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

interface CardProps {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
}

export function Card({ children, className = "", onPress }: CardProps) {
  const shell = `rounded-[20px] bg-white p-4 ${className}`;
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={`${shell} active:opacity-90`}>
        {children}
      </Pressable>
    );
  }
  return <View className={shell}>{children}</View>;
}
