/// <reference types="nativewind/types" />

declare module "*.css";
import "react-native";

declare module "react-native" {
  interface TextProps {
    className?: string;
  }
  interface ViewProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
}