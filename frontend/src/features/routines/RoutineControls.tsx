import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { colors, fonts } from '../accounts/theme';
import { CheckIcon } from '@/components/icons';

// Routine controls use the same fonts and colors as the existing account/task screens.
export const routineColors = ['#FFF1B8', '#DDECF4', '#F8D8CF', '#E3F0DD'];
export function RoutineField({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}>
    <Text style={routineStyles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#718897" style={routineStyles.input} {...props} />
  </View>;
}
export function RoutineAction({ label, onPress, disabled, secondary, danger, tint }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean; tint?: string;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[routineStyles.action, secondary ? routineStyles.secondary : null,
      tint ? { backgroundColor: tint } : null, danger ? { borderColor: '#A23535' } : null, disabled ? { opacity: 0.5 } : null]}>
    <Text style={[routineStyles.actionText, secondary ? { color: colors.ink } : null, danger ? { color: '#A23535' } : null]}>{label}</Text>
  </Pressable>;
}
export function RoundCheck({ checked }: { checked: boolean }) {
  return <View style={[routineStyles.check, checked ? { backgroundColor: colors.green, borderColor: colors.green } : null]}>
    {checked ? <CheckIcon color="white" /> : null}
  </View>;
}
export function RoutineModal({ visible, onClose, children, title }: {
  visible: boolean; onClose: () => void; children: ReactNode; title: string;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={routineStyles.backdrop}>
      <View style={routineStyles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={[routineStyles.heading, { marginBottom: 18 }]}>{title}</Text>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
export const routineStyles = StyleSheet.create({
  heading: { fontFamily: fonts.bold, color: colors.ink, fontSize: 18 },
  label: { fontFamily: fonts.bold, color: colors.ink, fontSize: 13 },
  body: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  muted: { fontFamily: fonts.medium, color: '#557085', fontSize: 12 },
  input: { minHeight: 54, borderWidth: 1, borderColor: '#C5D8E4', borderRadius: 14,
    backgroundColor: colors.white, paddingHorizontal: 15, color: colors.ink, fontFamily: fonts.medium, fontSize: 15 },
  action: { minHeight: 54, borderRadius: 16, backgroundColor: colors.green,
    justifyContent: 'center', alignItems: 'center', padding: 12 },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#C5D8E4' },
  actionText: { fontFamily: fonts.bold, color: colors.white, fontSize: 16, textAlign: 'center' },
  check: { height: 24, width: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#7D9BAD', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: '#294A6070', justifyContent: 'center', padding: 24 },
  modal: { maxHeight: '85%', borderRadius: 24, padding: 24, backgroundColor: colors.background, gap: 16 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 16 },
});
