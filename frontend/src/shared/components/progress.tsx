/**
 * Horizontal progress bar and circular percent ring. Widths are fixed Tailwind classes so the fill can be themed.
 */
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface ProgressBarProps {
  percent: number;
  fillClassName?: string;
}

const widthClasses: Record<number, string> = {
  0: "w-0",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-full",
};

function widthClass(percent: number): string {
  const stepped = Math.max(0, Math.min(100, Math.round(percent / 5) * 5));
  return widthClasses[stepped] ?? "w-0";
}

export function ProgressBar({ percent, fillClassName = "bg-leaf" }: ProgressBarProps) {
  return (
    <View className="h-3 w-full overflow-hidden rounded-full bg-[#E6F0E4]">
      <View className={`h-3 rounded-full ${fillClassName} ${widthClass(percent)}`} />
    </View>
  );
}

export function ProgressRing({ percent }: { percent: number }) {
  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <View className="h-[84px] w-[84px] items-center justify-center">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E4EFE4" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#65A878"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <Text className="absolute font-strong text-[20px] text-ink">{clamped}%</Text>
    </View>
  );
}
