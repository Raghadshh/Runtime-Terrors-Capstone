import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Task } from "@/lib/types";

export { type Task };

export const C = {
  bg: "#FEF9F1",
  white: "#FFFFFF",
  paleYellow: "#FDF3CB",
  green: "#75A67C",
  lightGreen: "#E6F1E0",
  navy: "#2E3B4E",
  muted: "#5D6B7A",
  danger: "#A8433B",
  border: "#D9DEE4",
  placeholder: "#9AA3AD",
};

export const FONTS = {
  400: "Nunito_500Medium",
  500: "Nunito_500Medium",
  600: "Nunito_700Bold",
  700: "Nunito_700Bold",
  800: "Nunito_800ExtraBold",
};

type TxtProps = React.ComponentProps<typeof Text> & {
  w?: 400 | 500 | 600 | 700 | 800;
  size?: number;
  color?: string;
};

export function Txt({
  w = 400,
  size = 13,
  color = C.navy,
  style,
  ...rest
}: TxtProps) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: FONTS[w], fontSize: size, color }, style]}
    />
  );
}

type IconProps = {
  name: "play" | "pause" | "reset" | "stopwatch";
  size?: number;
  color?: string;
  stroke?: number;
};

export function Icon({
  name,
  size = 20,
  color = C.navy,
  stroke = 2,
}: IconProps) {
  const common = {
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === "play" && (
        <Path d="M8 5.5v13L18 12 8 5.5Z" {...common} />
      )}

      {name === "pause" && (
        <>
          <Rect x="6" y="5" width="4" height="14" rx="1" {...common} />
          <Rect x="14" y="5" width="4" height="14" rx="1" {...common} />
        </>
      )}

      {name === "reset" && (
        <>
          <Path d="M5 10a7 7 0 1 1 2 7" {...common} />
          <Path d="M5 5v5h5" {...common} />
        </>
      )}

      {name === "stopwatch" && (
        <>
          <Circle cx="12" cy="13" r="7" {...common} />
          <Path d="M12 6V3M9.5 3h5M17 8l2-2" {...common} />
        </>
      )}
    </Svg>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "outline" | "primary";
  icon?: IconProps["name"];
  style?: any;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  style,
  disabled = false,
}: ButtonProps) {
  const outline = variant === "outline";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        outline ? styles.outline : styles.primary,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={15}
          color={outline ? C.green : C.white}
          stroke={2.2}
        />
      )}
      <Txt
        w={700}
        size={12}
        color={outline ? C.green : C.white}
      >
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  primary: {
    backgroundColor: C.green,
  },
  outline: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.green,
  },
  disabled: {
    opacity: 0.5,
  },
});
