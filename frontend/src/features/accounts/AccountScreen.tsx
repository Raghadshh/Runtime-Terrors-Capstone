import { type ReactNode, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fonts } from './theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function AccountButton({ label, onPress, kind = 'primary', disabled = false }: ButtonProps) {
  const secondary = kind === 'secondary';
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary ? styles.secondaryText : styles.primaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ScreenProps = {
  subtitle: string;
  children?: ReactNode;
  primary: ButtonProps;
  secondary: ButtonProps;
  footer?: string;
  onFooterPress?: () => void;
  notice?: string;
};

export function AccountScreen({ subtitle, children, primary, secondary, footer, onFooterPress, notice }: ScreenProps) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Text style={styles.logo}>
            Remind<Text style={styles.logoGreen}>ME</Text>
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.fields}>{children}</View>

        <View style={styles.bottom}>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <AccountButton {...primary} />
          <AccountButton {...secondary} kind="secondary" />
          {footer ? onFooterPress ? (
            <Pressable accessibilityRole="button" accessibilityLabel={footer} onPress={onFooterPress} hitSlop={10}>
              <Text style={styles.footer}>{footer}</Text>
            </Pressable>
          ) : <Text style={styles.footer}>{footer}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 92, paddingBottom: 48 },
  brand: { alignItems: 'center' },
  logo: { color: colors.ink, fontFamily: fonts.extraBold, fontSize: 42, lineHeight: 57 },
  logoGreen: { color: colors.green },
  subtitle: { color: colors.ink, fontFamily: fonts.medium, fontSize: 17, marginTop: 8 },
  fields: { gap: 24, marginTop: 56 },
  bottom: { marginTop: 'auto', paddingTop: 40, gap: 12 },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  primaryButton: { backgroundColor: colors.green },
  secondaryButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1.5,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 18 },
  primaryText: { color: colors.greenText },
  secondaryText: { color: colors.ink },
  pressed: { opacity: 0.75 },
  footer: {
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  notice: {
    color: colors.error,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
});
