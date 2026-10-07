import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts } from './theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormField({ label, error, hint, ...inputProps }: Props) {
  return (
    <View>
      <View style={[styles.card, error ? styles.errorCard : null]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.ink}
          style={styles.input}
          {...inputProps}
        />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 82,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'center',
  },
  errorCard: { borderColor: colors.error, borderWidth: 1 },
  label: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13, marginBottom: 3 },
  input: { color: colors.ink, fontFamily: fonts.medium, fontSize: 17, padding: 0 },
  hint: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
  error: { color: colors.error, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
});
