/**
 * Labeled field matching the Figma wireframe input: white card, muted label, ink value.
 */
import { Text, TextInput, View } from "react-native";

interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  multiline?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  multiline = false,
}: InputProps) {
  return (
    <View className={`w-full gap-1.5 rounded-[20px] bg-white p-[14px] ${multiline ? "min-h-[96px]" : "h-[82px]"}`}>
      <Text className="font-brand text-[13px] leading-[18px] text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#718897"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        multiline={multiline}
        className="p-0 font-soft text-[17px] leading-[23px] text-ink"
      />
    </View>
  );
}