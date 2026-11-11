/**
 * Line icons for the tab bar, back control, and completed tasks.
 */
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface IconProps {
  color?: string;
  size?: number;
}

export function HomeIcon({ color = "#294A60", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    </Svg>
  );
}

export function TasksIcon({ color = "#294A60", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth={1.7} />
      <Path d="M8 12.5 10.2 15 16 9" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function RoutinesIcon({ color = "#294A60", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 7.5A7 7 0 1 1 5.2 13" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M7 4.5v3.2H10" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ProgressIcon({ color = "#294A60", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19V11M12 19V6M19 19v-5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileIcon({ color = "#294A60", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="9" r="3.2" stroke={color} strokeWidth={1.7} />
      <Path d="M6.5 19.2c1.2-2.6 3.1-3.7 5.5-3.7s4.3 1.1 5.5 3.7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ color = "#294A60" }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5 8 12l7 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ color = "#2C7A4B", size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="M2.5 7.2 5.4 10 11.5 3.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface StarIconProps extends IconProps {
  stroke?: string;
}

export function StarIcon({ color = "#FFD66B", size = 22, stroke }: StarIconProps) {
  return (
    <Svg width={size} height={size * (27 / 28)} viewBox="0 0 28 27" fill="none">
      <Path
        d="M14 0L18 9L28 10L20 17L22 27L14 22L5 27L7 17L0 10L10 9L14 0Z"
        fill={color}
        stroke={stroke}
        strokeWidth={stroke ? 0.9 : 0}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({ color = "#557186", size = 18 }: IconProps) {
  return (
    <Svg width={size * (16 / 24)} height={size} viewBox="0 0 16 24" fill="none">
      <Path d="M4.5 10V6a3.5 3.5 0 0 1 7 0v4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Rect x="2" y="9.5" width="12" height="12.5" rx="3" stroke={color} strokeWidth={1.7} />
      <Path d="M8 14.5v3" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function ClockIcon({ color = "#294A60", size = 20 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={1.7} /><Path d="M12 7v5l3 2" stroke={color} strokeWidth={1.7} strokeLinecap="round" /></Svg>;
}

export function CalendarIcon({ color = "#294A60", size = 20 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="4" y="6" width="16" height="15" rx="2" stroke={color} strokeWidth={1.7} /><Path d="M8 3v6M16 3v6M4 11h16" stroke={color} strokeWidth={1.7} strokeLinecap="round" /></Svg>;
}

export function BellIcon({ color = "#294A60", size = 20 }: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
